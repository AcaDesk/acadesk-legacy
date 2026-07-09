/**
 * Homework Server Actions
 *
 * 숙제(집에서 해오는 과제) 관리를 위한 Server Actions
 * - student_tasks 테이블에서 kind='homework'인 레코드 관리
 * - homework_submissions 테이블로 제출/채점 관리
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { createNotification } from '@/lib/notification-helpers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createHomeworkSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, '최소 한 명의 학생을 선택해야 합니다'),
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.string(), // ISO date string
})

const submitHomeworkSchema = z.object({
  taskId: z.string().uuid(),
  textAnswer: z.string().optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
})

const gradeHomeworkSchema = z.object({
  submissionId: z.string().uuid(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all homeworks with submission status + student info (single query)
 *
 * RLS 활성화 후 page.tsx 의 cookie-client 쿼리가 깨졌던 N+1 학생 fetch 를
 * service_role JOIN 한 번으로 대체합니다.
 */
export async function getHomeworksWithSubmissions() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('homeworks')
      .select(`
        *,
        students:student_id (
          student_code,
          user_id ( name )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getHomeworksWithSubmissions] Error:', error)
    const rawMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : getErrorMessage(error)
    return {
      success: false,
      data: null,
      error: rawMessage,
    }
  }
}

/**
 * Create homework for multiple students
 */
export async function createHomework(input: z.infer<typeof createHomeworkSchema>) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const validated = createHomeworkSchema.parse(input)
    const supabase = createServiceRoleClient()

    // Create homework tasks for each student
    const tasks = validated.studentIds.map((studentId) => ({
      tenant_id: tenantId,
      student_id: studentId,
      assigned_by: userId,
      kind: 'homework' as const,
      title: validated.title,
      description: validated.description || null,
      subject: validated.subject || null,
      priority: validated.priority,
      due_date: validated.dueDate,
      due_day_of_week: new Date(validated.dueDate).getDay() === 0
        ? 7
        : new Date(validated.dueDate).getDay(), // 0(일요일) → 7로 변환
    }))

    const { data, error } = await supabase
      .from('student_tasks')
      .insert(tasks)
      .select()

    if (error) throw error

    // Create empty submission records for each homework
    if (data && data.length > 0) {
      const submissions = data.map((task) => ({
        tenant_id: tenantId,
        task_id: task.id,
      }))

      await supabase.from('homework_submissions').insert(submissions)
    }

    revalidatePath('/homeworks')

    // 보호자에게 숙제 등록 알림톡 발송 (fire-and-forget)
    if (data && data.length > 0) {
      const dueDateStr = new Date(validated.dueDate).toLocaleDateString('ko-KR')
      void import('@/lib/messaging/event-alimtalk').then(({ fireEventAlimtalk }) => {
        for (const task of data) {
          void fireEventAlimtalk(tenantId, 'homework_assigned', task.student_id, {
            과목명: validated.subject || '미지정',
            숙제명: validated.title,
            마감일: dueDateStr,
          })
        }
      })

      // 스태프 in-app 알림 (fire-and-forget) — 학생 수와 마감일 요약 1건.
      const dueDateStr2 = new Date(validated.dueDate).toLocaleDateString('ko-KR')
      void createNotification({
        supabase,
        tenantId,
        actorUserId: userId,
        type: 'homework_assigned',
        title: '숙제 배정',
        message: `${data.length}명에게 "${validated.title}" 숙제가 배정되었습니다. (마감 ${dueDateStr2})`,
        referenceType: 'homework',
        referenceId: null,
        actionUrl: '/homeworks',
      })
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createHomework] Error:', error)
    const rawMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : getErrorMessage(error)
    return {
      success: false,
      data: null,
      error: rawMessage,
    }
  }
}

/**
 * Submit homework (student/parent side)
 */
export async function submitHomework(input: z.infer<typeof submitHomeworkSchema>) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const validated = submitHomeworkSchema.parse(input)
    const supabase = createServiceRoleClient()

    // 과제가 현재 테넌트 소속인지 검증 (교차 테넌트 제출 방지)
    const { data: task } = await supabase
      .from('student_tasks')
      .select('id')
      .eq('id', validated.taskId)
      .eq('tenant_id', tenantId)
      .single()

    if (!task) {
      return { success: false, error: '과제를 찾을 수 없습니다' }
    }

    // Update or create submission
    const { data: existing } = await supabase
      .from('homework_submissions')
      .select('id')
      .eq('task_id', validated.taskId)
      .eq('tenant_id', tenantId)
      .single()

    if (existing) {
      // Update existing submission
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          submitted_at: new Date().toISOString(),
          submitted_by: userId,
          text_answer: validated.textAnswer || null,
          attachment_urls: validated.attachmentUrls || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)

      if (error) throw error
    } else {
      // Create new submission
      const { error } = await supabase
        .from('homework_submissions')
        .insert({
          tenant_id: tenantId,
          task_id: validated.taskId,
          submitted_at: new Date().toISOString(),
          submitted_by: userId,
          text_answer: validated.textAnswer || null,
          attachment_urls: validated.attachmentUrls || null,
        })

      if (error) throw error
    }

    // Mark task as completed
    await supabase
      .from('student_tasks')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.taskId)
      .eq('tenant_id', tenantId)

    revalidatePath('/homeworks')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[submitHomework] Error:', error)
    const rawMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : getErrorMessage(error)
    return {
      success: false,
      error: rawMessage,
    }
  }
}

/**
 * Grade homework submission
 */
export async function gradeHomework(input: z.infer<typeof gradeHomeworkSchema>) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const validated = gradeHomeworkSchema.parse(input)
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        graded_by: userId,
        graded_at: new Date().toISOString(),
        score: validated.score || null,
        feedback: validated.feedback || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.submissionId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    // Mark task as verified if graded
    if (data) {
      await supabase
        .from('student_tasks')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.task_id)
        .eq('tenant_id', tenantId)
    }

    revalidatePath('/homeworks')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[gradeHomework] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get homework by ID with submission details
 */
export async function getHomeworkById(homeworkId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('homeworks')
      .select('*')
      .eq('id', homeworkId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getHomeworkById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete homework (soft delete)
 */
export async function deleteHomework(homeworkId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('student_tasks')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', homeworkId)
      .eq('tenant_id', tenantId)
      .eq('kind', 'homework')

    if (error) throw error

    revalidatePath('/homeworks')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteHomework] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 숙제 안내 부모님 발송
 * - 해당 학생의 등록된 보호자에게 SMS/LMS로 숙제 내용 발송
 */
export async function sendHomeworkNotificationToGuardians(homeworkId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 숙제 정보 조회
    const { data: homework, error: hwError } = await supabase
      .from('student_tasks')
      .select('id, title, description, subject, due_date, student_id')
      .eq('id', homeworkId)
      .eq('tenant_id', tenantId)
      .eq('kind', 'homework')
      .is('deleted_at', null)
      .single()

    if (hwError || !homework) throw new Error('숙제를 찾을 수 없습니다')

    // 2. 학생 이름 조회
    const { data: student } = await supabase
      .from('students')
      .select('student_code, user_id(name)')
      .eq('id', homework.student_id)
      .single()

    const userIdField = student?.user_id as { name: string } | { name: string }[] | null
    const studentName = Array.isArray(userIdField)
      ? (userIdField[0]?.name ?? '학생')
      : (userIdField?.name ?? '학생')

    // 3. 학원명 조회
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const academyName = tenant?.name ?? '학원'

    // 4. 보호자 조회
    const { data: guardians } = await supabase
      .from('student_guardians')
      .select(`
        guardians (
          id,
          name,
          phone,
          users (phone)
        )
      `)
      .eq('student_id', homework.student_id)
      .is('deleted_at', null)

    if (!guardians || guardians.length === 0) {
      throw new Error(
        '등록된 보호자가 없습니다.\n학생 관리 > 보호자 정보에서 보호자를 먼저 등록해주세요.'
      )
    }

    // 5. 메시지 생성
    const dueDateStr = new Date(homework.due_date).toLocaleDateString('ko-KR')
    const hasDescription = !!(homework.description && homework.description.trim().length > 0)

    let messageBody: string
    let messageType: 'sms' | 'lms'

    if (hasDescription) {
      const lines = [
        `[${academyName}] 숙제 안내`,
        '',
        `${studentName} 학생의 숙제가 출제되었습니다.`,
        '',
        ...(homework.subject ? [`과목: ${homework.subject}`] : []),
        `제목: ${homework.title}`,
        `내용: ${homework.description}`,
        `마감일: ${dueDateStr}`,
      ]
      messageBody = lines.join('\n')
      messageType = 'lms'
    } else {
      const subjectPart = homework.subject ? ` (${homework.subject})` : ''
      messageBody = `[${academyName}] ${studentName} 숙제${subjectPart}: ${homework.title} (마감: ${dueDateStr})`
      messageType = messageBody.length > 90 ? 'lms' : 'sms'
    }

    // 6. 보호자별 발송
    const { sendMessage } = await import('@/lib/messaging/provider')

    let successCount = 0
    let failCount = 0
    const details: Array<{ name: string; success: boolean; error: string | null }> = []

    for (const sg of guardians) {
      const guardian = sg.guardians as unknown as {
        id: string
        name: string
        phone: string | null
        users: { phone: string | null } | null
      }

      const phone = guardian.phone || guardian.users?.phone
      if (!phone) {
        details.push({ name: guardian.name, success: false, error: '전화번호 없음' })
        failCount++
        continue
      }

      const result = await sendMessage({ type: messageType, to: phone, message: messageBody })

      if (result.success) {
        successCount++
        await supabase.from('notification_logs').insert({
          tenant_id: tenantId,
          student_id: homework.student_id,
          notification_type: messageType,
          status: 'sent',
          message: messageBody,
          sent_at: new Date().toISOString(),
          recipient_name: guardian.name,
          recipient_phone: phone,
        })
      } else {
        failCount++
      }

      details.push({ name: guardian.name, success: result.success, error: result.error ?? null })
    }

    if (successCount === 0) {
      throw new Error(
        failCount > 0
          ? '모든 보호자에게 발송이 실패했습니다'
          : '발송 가능한 보호자가 없습니다. 보호자 전화번호를 확인해주세요.'
      )
    }

    return {
      success: true as const,
      data: { total: successCount + failCount, successCount, failCount, details },
      error: null,
    }
  } catch (error) {
    console.error('[sendHomeworkNotificationToGuardians] Error:', error)
    return {
      success: false as const,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get submission statistics
 */
export async function getSubmissionStats() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get all homeworks
    const { data: homeworks, error: hwError } = await supabase
      .from('student_tasks')
      .select('id, completed_at, verified_at')
      .eq('tenant_id', tenantId)
      .eq('kind', 'homework')
      .is('deleted_at', null)

    if (hwError) throw hwError

    const total = homeworks?.length || 0
    const submitted = homeworks?.filter((h) => h.completed_at)?.length || 0
    const graded = homeworks?.filter((h) => h.verified_at)?.length || 0
    const pending = total - submitted

    return {
      success: true,
      data: {
        total,
        submitted,
        graded,
        pending,
        submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
        gradingRate: total > 0 ? Math.round((graded / total) * 100) : 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getSubmissionStats] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
