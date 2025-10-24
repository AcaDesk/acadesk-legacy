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
 * Get all homeworks with submission status
 */
export async function getHomeworksWithSubmissions() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('homeworks')
      .select('*')
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
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
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

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createHomework] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
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

    // Update or create submission
    const { data: existing } = await supabase
      .from('homework_submissions')
      .select('id')
      .eq('task_id', validated.taskId)
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

    revalidatePath('/homeworks')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[submitHomework] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Grade homework submission
 */
export async function gradeHomework(input: z.infer<typeof gradeHomeworkSchema>) {
  try {
    const { userId } = await verifyStaff()
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
