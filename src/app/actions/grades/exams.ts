/**
 * Exam Management Server Actions
 *
 * 모든 시험 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { createNotification } from '@/lib/notification-helpers'
import { getStudentsMaster } from '@/app/actions/students/queries'

// ============================================================================
// Validation Schemas
// ============================================================================

const examSchema = z.object({
  name: z.string().min(1, '시험명은 필수입니다'),
  subject_id: z.string().uuid().nullable().optional(),
  category_code: z.string().nullable().optional(),
  exam_type: z.string().nullable().optional(),
  exam_date: z.string().nullable().optional(),
  class_id: z.string().uuid().nullable().optional(),
  total_questions: z.number().int().positive().nullable().optional(),
  passing_score: z.number().min(0).max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurring_schedule: z.string().nullable().optional(),
})

type ExamListPeriod = 'this_month' | 'last_15_days' | 'last_3_months' | 'all'

function getDateRangeByPeriod(period: ExamListPeriod) {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)

  if (period === 'all') {
    return { from: null as string | null, to: null as string | null }
  }

  if (period === 'this_month') {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    return { from, to }
  }

  const fromDate = new Date(today)
  if (period === 'last_15_days') {
    fromDate.setDate(fromDate.getDate() - 15)
  } else {
    fromDate.setMonth(fromDate.getMonth() - 3)
  }

  return { from: fromDate.toISOString().slice(0, 10), to }
}

async function autoArchiveOldCompletedExams(params: {
  tenantId: string
  serviceClient: ReturnType<typeof createServiceRoleClient>
}) {
  const { tenantId, serviceClient } = params
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 15)
  const thresholdDate = threshold.toISOString().slice(0, 10)

  const { error } = await serviceClient
    .from('exams')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .is('archived_at', null)
    .not('exam_date', 'is', null)
    .lte('exam_date', thresholdDate)

  if (error) {
    console.error('[autoArchiveOldCompletedExams] Error:', error)
  }
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all exams with optional filtering
 *
 * @param filters - Optional filters for class, category, date range
 * @returns List of exams or error
 */
export async function getExams(filters?: {
  classId?: string
  categoryCode?: string
  dateFrom?: string
  dateTo?: string
  includeArchived?: boolean
  period?: ExamListPeriod
}) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Build query
    let query = serviceClient
      .from('exams')
      .select(`
        id,
        name,
        category_code,
        exam_type,
        exam_date,
        class_id,
        total_questions,
        passing_score,
        description,
        status,
        archived_at,
        created_at,
        subjects (
          id,
          name,
          color
        ),
        classes (
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('exam_date', { ascending: false })

    if (!filters?.includeArchived) {
      query = query.is('archived_at', null)
    }

    // 4. Apply filters
    if (filters?.classId && filters.classId !== 'all') {
      query = query.eq('class_id', filters.classId)
    }

    if (filters?.categoryCode && filters.categoryCode !== 'all') {
      query = query.eq('category_code', filters.categoryCode)
    }

    const period = filters?.period ?? 'all'
    const periodRange = getDateRangeByPeriod(period)
    const finalDateFrom = filters?.dateFrom || periodRange.from
    const finalDateTo = filters?.dateTo || periodRange.to

    if (finalDateFrom) {
      query = query.gte('exam_date', finalDateFrom)
    }

    if (finalDateTo) {
      query = query.lte('exam_date', finalDateTo)
    }

    // 5. Execute query — auto-archive 와 병렬 (archive는 대부분 0건 UPDATE라 read 와 race 영향 미미)
    const [{ data: exams, error }] = await Promise.all([
      query,
      autoArchiveOldCompletedExams({ tenantId, serviceClient }),
    ])

    if (error) {
      console.error('[getExams] Query error:', error.message)
      throw new Error('시험 조회에 실패했습니다')
    }

    // 6. 시험별 배정 학생 수를 단일 SQL 집계로 조회
    //
    // 기존 `select('exam_id').in('exam_id', ...)` 방식은 supabase-js 기본 1000행 제한에
    // 걸려, 학원의 누적 점수 행이 많을 때 다수 시험의 카운트가 0으로 보이던 버그가 있었음
    // (migration 20260518000005 참고).
    const examIds = (exams || []).map(e => e.id)
    const countMap = new Map<string, number>()

    if (examIds.length > 0) {
      const { data: scoreCounts, error: countError } = await serviceClient.rpc(
        'get_exam_score_counts',
        { p_tenant_id: tenantId, p_exam_ids: examIds }
      )
      if (countError) {
        console.error('[getExams] Score count RPC error:', countError.message)
      } else {
        for (const row of (scoreCounts || []) as Array<{ exam_id: string; cnt: number }>) {
          countMap.set(row.exam_id, Number(row.cnt) || 0)
        }
      }
    }

    // 시험에 카운트 매핑
    const examsWithCounts = (exams || []).map(exam => ({
      ...exam,
      _count: { exam_scores: countMap.get(exam.id) || 0 },
    }))

    return {
      success: true,
      data: examsWithCounts,
      error: null,
    }
  } catch (error) {
    console.error('[getExams] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get exam by ID
 *
 * @param examId - Exam ID
 * @returns Exam data or error
 */
export async function getExamById(examId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Query exam
    const { data: exam, error } = await serviceClient
      .from('exams')
      .select(`
        id,
        name,
        subject_id,
        category_code,
        exam_type,
        exam_date,
        class_id,
        total_questions,
        passing_score,
        description,
        is_recurring,
        recurring_schedule,
        created_at,
        classes (
          id,
          name
        )
      `)
      .eq('id', examId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !exam) {
      return {
        success: false,
        data: null,
        error: '시험을 찾을 수 없습니다',
      }
    }

    return {
      success: true,
      data: exam,
      error: null,
    }
  } catch (error) {
    console.error('[getExamById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new exam
 *
 * @param input - Exam data
 * @returns Created exam ID or error
 */
export async function createExam(input: z.infer<typeof examSchema>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = examSchema.parse(input)

    // 3. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 4. Insert exam
    // exam_date가 없으면 현재 날짜로 자동 설정 (리포트 필터링을 위해 필요)
    const examDate = validated.exam_date || new Date().toISOString().slice(0, 10)

    const { data: exam, error } = await serviceClient
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name: validated.name,
        subject_id: validated.subject_id || null,
        category_code: validated.category_code && validated.category_code.trim() !== '' ? validated.category_code : null,
        exam_type: validated.exam_type || null,
        exam_date: examDate,
        class_id: validated.class_id || null,
        total_questions: validated.total_questions || null,
        passing_score: validated.passing_score || null,
        description: validated.description || null,
        is_recurring: validated.is_recurring || false,
        recurring_schedule: validated.recurring_schedule || null,
      })
      .select('id')
      .single()

    if (error || !exam) {
      console.error('[createExam] Creation error:', error?.message)
      throw new Error('시험 생성에 실패했습니다')
    }

    // 5. Revalidate pages
    revalidatePath('/grades/exams')
    revalidatePath('/grades')
    revalidatePath(`/grades/exams/${exam.id}`)
    if (validated.is_recurring) {
      revalidatePath('/grades/exam-templates')
    }

    return {
      success: true,
      data: { examId: exam.id },
      error: null,
    }
  } catch (error) {
    console.error('[createExam] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update an exam
 *
 * @param examId - Exam ID
 * @param input - Exam data to update
 * @returns Success or error
 */
export async function updateExam(
  examId: string,
  input: Partial<z.infer<typeof examSchema>>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify exam belongs to tenant
    const { data: existingExam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !existingExam) {
      return {
        success: false,
        error: '시험을 찾을 수 없습니다',
      }
    }

    if (existingExam.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Prepare update data (convert empty strings to null)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Only include fields that are provided and convert empty strings to null
    if (input.name !== undefined) updateData.name = input.name
    if (input.subject_id !== undefined) updateData.subject_id = input.subject_id || null
    if (input.category_code !== undefined) {
      updateData.category_code = input.category_code && input.category_code.trim() !== ''
        ? input.category_code
        : null
    }
    if (input.exam_type !== undefined) updateData.exam_type = input.exam_type || null
    if (input.exam_date !== undefined) updateData.exam_date = input.exam_date || null
    if (input.class_id !== undefined) updateData.class_id = input.class_id || null
    if (input.total_questions !== undefined) updateData.total_questions = input.total_questions || null
    if (input.passing_score !== undefined) updateData.passing_score = input.passing_score || null
    if (input.description !== undefined) updateData.description = input.description || null
    if (input.is_recurring !== undefined) updateData.is_recurring = input.is_recurring || false
    if (input.recurring_schedule !== undefined) updateData.recurring_schedule = input.recurring_schedule || null

    // 5. Update exam
    const { error: updateError } = await serviceClient
      .from('exams')
      .update(updateData)
      .eq('id', examId)

    if (updateError) {
      throw updateError
    }

    // 6. Revalidate pages
    revalidatePath('/grades/exams')
    revalidatePath(`/grades/exams/${examId}`)
    revalidatePath('/grades')
    revalidatePath('/grades/exam-templates')
    revalidatePath(`/grades/exam-templates/${examId}/edit`)

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateExam] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete an exam (soft delete)
 *
 * @param examId - Exam ID
 * @returns Success or error
 */
export async function deleteExam(examId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify exam belongs to tenant
    const { data: existingExam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !existingExam) {
      return {
        success: false,
        error: '시험을 찾을 수 없습니다',
      }
    }

    if (existingExam.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Soft delete exam
    const { error: deleteError } = await serviceClient
      .from('exams')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', examId)

    if (deleteError) {
      throw deleteError
    }

    // 5. Revalidate pages
    revalidatePath('/grades/exams')
    revalidatePath('/grades')
    revalidatePath('/grades/exam-templates')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteExam] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Bulk delete exams (soft delete)
 *
 * @param ids - Array of exam IDs to delete
 * @returns Success with deleted count or error
 */
export async function bulkDeleteExams(ids: string[]) {
  try {
    if (!ids.length) {
      return { success: false, error: '삭제할 시험을 선택해주세요', data: null }
    }

    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('exams')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id')

    if (error) throw error

    revalidatePath('/grades/exams')
    revalidatePath('/grades')

    return {
      success: true,
      data: { deletedCount: data?.length ?? 0 },
      error: null,
    }
  } catch (error) {
    console.error('[bulkDeleteExams] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get exam categories
 *
 * @returns List of exam categories or error
 */
/**
 * Get exam categories for current tenant
 * Uses tenant_codes table with type 'exam_category'
 */
export async function getExamCategories() {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    // Default categories that should exist
    const defaultCategories = [
      { code: 'monthly', label: '월말평가' },
      { code: 'weekly', label: '주간평가' },
      { code: 'quiz', label: 'Quiz' },
      { code: 'note', label: '쪽지시험' },
      { code: 'level_test', label: '레벨테스트' },
      { code: 'mock', label: '모의고사' },
      { code: 'other', label: '기타' },
    ]

    // Query tenant_codes for exam categories
    const { data: tenantCategories, error } = await serviceClient
      .from('tenant_codes')
      .select('code, label')
      .eq('tenant_id', tenantId)
      .eq('type', 'exam_category')
      .is('deleted_at', null)
      .order('label')

    if (error) {
      console.error('[getExamCategories] Error:', error)
      // Return default categories on error
      return {
        success: true,
        data: defaultCategories,
        error: null,
      }
    }

    // If no categories exist, initialize with defaults
    if (!tenantCategories || tenantCategories.length === 0) {
      const { error: insertError } = await serviceClient
        .from('tenant_codes')
        .insert(
          defaultCategories.map((cat) => ({
            tenant_id: tenantId,
            type: 'exam_category',
            code: cat.code,
            label: cat.label,
          }))
        )

      if (insertError) {
        console.error('[getExamCategories] Error inserting defaults:', insertError)
      }

      return {
        success: true,
        data: defaultCategories,
        error: null,
      }
    }

    return {
      success: true,
      data: tenantCategories,
      error: null,
    }
  } catch (error) {
    console.error('[getExamCategories] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Mark exam grading as completed
 *
 * @param examId - Exam ID
 * @returns Success or error
 */
export async function completeExamGrading(examId: string) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    // Verify exam belongs to tenant
    const { data: exam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id, name')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error: updateError } = await serviceClient
      .from('exams')
      .update({ status: 'completed', archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (updateError) throw updateError

    revalidatePath('/grades/entry')
    revalidatePath('/grades/exams')
    revalidatePath('/grades')
    revalidateTag(`grade-entry:${tenantId}`)

    // 성적 채점 완료 → 응시 학생의 보호자에게 알림톡 발송 (fire-and-forget).
    // 학원이 'exam_grade_ready' 이벤트 구독을 켜둔 경우에만 실제 발송.
    void import('@/lib/messaging/event-alimtalk').then(async ({ fireEventAlimtalk }) => {
      const { data: scores } = await serviceClient
        .from('exam_scores')
        .select('student_id')
        .eq('exam_id', examId)
        .eq('tenant_id', tenantId)
      if (!scores?.length) return
      const examName = exam.name || '시험'
      for (const s of scores) {
        if (!s.student_id) continue
        void fireEventAlimtalk(tenantId, 'exam_grade_ready', s.student_id, {
          시험명: examName,
          성적링크: '',
        })
      }
    })

    // 스태프 in-app 알림 (fire-and-forget) — 채점 완료 사실을 다른 스태프에게 통지.
    void createNotification({
      supabase: serviceClient,
      tenantId,
      actorUserId: userId,
      type: 'exam_grading_completed',
      title: '시험 채점 완료',
      message: `"${exam.name || '시험'}" 채점이 완료되어 성적이 발표되었습니다.`,
      referenceType: 'exam',
      referenceId: examId,
      actionUrl: '/grades/exams',
    })

    return { success: true, error: null }
  } catch (error) {
    console.error('[completeExamGrading] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Reopen completed exam grading (set status back to 'scheduled')
 *
 * @param examId - Exam ID
 * @returns Success or error
 */
export async function reopenExamGrading(examId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error: updateError } = await serviceClient
      .from('exams')
      .update({ status: 'scheduled', archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (updateError) throw updateError

    revalidatePath('/grades/entry')
    revalidatePath('/grades/exams')
    revalidatePath('/grades')
    revalidateTag(`grade-entry:${tenantId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error('[reopenExamGrading] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function archiveExam(examId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error } = await serviceClient
      .from('exams')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (error) throw error

    revalidatePath('/grades')
    revalidatePath('/grades/entry')
    revalidatePath('/grades/exams')

    return { success: true, error: null }
  } catch (error) {
    console.error('[archiveExam] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function unarchiveExam(examId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error } = await serviceClient
      .from('exams')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (error) throw error

    revalidatePath('/grades')
    revalidatePath('/grades/entry')
    revalidatePath('/grades/exams')

    return { success: true, error: null }
  } catch (error) {
    console.error('[unarchiveExam] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Get exam templates (is_recurring=true) for the templates list page
 */
export async function getExamTemplates() {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('exams')
      .select(`
        id,
        name,
        subject_id,
        category_code,
        exam_type,
        total_questions,
        passing_score,
        recurring_schedule,
        is_recurring,
        is_template_active,
        description,
        class_id,
        classes (name),
        subjects (name, color)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_recurring', true)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('[getExamTemplates] Query error:', error.message)
      throw new Error('템플릿 조회에 실패했습니다')
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getExamTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 템플릿을 기반으로 신규 시험을 즉시 생성합니다 (시험 목록 페이지의 사이드 패널에서 사용).
 *
 * - 템플릿의 name/category/exam_type/total_questions/passing_score/description/class_id/subject_id 를 복사
 * - exam_date 는 호출자가 지정 (필수)
 * - is_recurring=false, recurring_schedule=null 로 일회성 시험으로 생성
 */
export async function createExamFromTemplate(templateId: string, examDate: string) {
  try {
    const { tenantId } = await verifyStaff()
    if (!templateId) {
      return { success: false, data: null, error: '템플릿 ID가 필요합니다' }
    }
    if (!examDate) {
      return { success: false, data: null, error: '시험일을 선택해주세요' }
    }

    const serviceClient = createServiceRoleClient()

    const { data: template, error: fetchError } = await serviceClient
      .from('exams')
      .select(`
        id, tenant_id, name, subject_id, category_code, exam_type,
        total_questions, passing_score, description, class_id, is_recurring
      `)
      .eq('id', templateId)
      .maybeSingle()

    if (fetchError || !template) {
      return { success: false, data: null, error: '템플릿을 찾을 수 없습니다' }
    }
    if (template.tenant_id !== tenantId) {
      return { success: false, data: null, error: '권한이 없습니다' }
    }
    if (!template.is_recurring) {
      return { success: false, data: null, error: '템플릿이 아닙니다' }
    }

    const { data: created, error: insertError } = await serviceClient
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name: template.name,
        subject_id: template.subject_id,
        category_code: template.category_code,
        exam_type: template.exam_type,
        exam_date: examDate,
        class_id: template.class_id,
        total_questions: template.total_questions,
        passing_score: template.passing_score,
        description: template.description,
        is_recurring: false,
        recurring_schedule: null,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      throw insertError ?? new Error('시험 생성 실패')
    }

    revalidatePath('/grades')
    revalidatePath('/grades/exams')

    return { success: true, data: { examId: created.id }, error: null }
  } catch (error) {
    console.error('[createExamFromTemplate] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Toggle exam template active state (is_template_active)
 */
export async function setExamTemplateActive(examId: string, active: boolean) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: existing, error: fetchError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (fetchError || !existing) {
      return { success: false, error: '템플릿을 찾을 수 없습니다' }
    }

    if (existing.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error } = await serviceClient
      .from('exams')
      .update({ is_template_active: active, updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (error) throw error

    revalidatePath('/grades/exam-templates')

    return { success: true, error: null }
  } catch (error) {
    console.error('[setExamTemplateActive] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Get all students for an exam with their current assignment status
 *
 * 학생 마스터 목록은 `getStudentsMaster()` 캐시(5분 TTL)를 재사용하고,
 * 시험별 배정 정보(exam_scores)만 매번 조회합니다.
 */
export async function getStudentsForExamAssignment(examId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const [studentsMasterResult, { data: assignedScores, error: scoresError }] =
      await Promise.all([
        getStudentsMaster(),
        serviceClient
          .from('exam_scores')
          .select('student_id')
          .eq('tenant_id', tenantId)
          .eq('exam_id', examId),
      ])

    if (scoresError) throw scoresError
    if (!studentsMasterResult.success) {
      throw new Error(studentsMasterResult.error || '학생 목록을 불러오지 못했습니다.')
    }

    const assignedIds = new Set((assignedScores || []).map((s) => s.student_id))
    const students = studentsMasterResult.data.map((s) => ({
      id: s.id,
      student_code: s.student_code,
      name: s.name,
      grade: s.grade,
      isAssigned: assignedIds.has(s.id),
    }))

    return {
      success: true,
      data: { students, assignedIds: Array.from(assignedIds) },
      error: null,
    }
  } catch (error) {
    console.error('[getStudentsForExamAssignment] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Assign/unassign students to an exam by adjusting exam_scores rows
 */
export async function assignStudentsToExam(
  examId: string,
  addIds: string[],
  removeIds: string[]
) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: examError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (examError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    if (addIds.length > 0) {
      const { error: insertError } = await serviceClient
        .from('exam_scores')
        .insert(
          addIds.map((studentId) => ({
            tenant_id: tenantId,
            exam_id: examId,
            student_id: studentId,
            percentage: null,
            feedback: null,
          }))
        )

      if (insertError) throw insertError
    }

    if (removeIds.length > 0) {
      const { error: deleteError } = await serviceClient
        .from('exam_scores')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('exam_id', examId)
        .in('student_id', removeIds)

      if (deleteError) throw deleteError
    }

    revalidatePath(`/grades/exams/${examId}`)
    revalidatePath('/grades/exams')
    revalidatePath('/grades')

    return { success: true, error: null }
  } catch (error) {
    console.error('[assignStudentsToExam] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

export interface ExamAssignedStudent {
  id: string
  student_code: string
  name: string
  grade: string | null
}

export interface ExamAssignedScore {
  student_id: string
  score: number | null
  total_points: number | null
  percentage: number | null
  feedback: string | null
}

/**
 * Get students currently assigned to an exam (rows in exam_scores)
 * along with their score data. Used by the exam detail page.
 *
 * Replaces the previous client-side query that broke after RLS was
 * enabled on exam_scores/students/users (migration 20260516000010).
 */
export async function getExamAssignments(examId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: scoreRecords, error } = await serviceClient
      .from('exam_scores')
      .select(`
        student_id,
        score,
        total_points,
        percentage,
        feedback,
        students!inner (
          id,
          student_code,
          grade,
          users!user_id (name)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('exam_id', examId)
      .is('deleted_at', null)

    if (error) throw error

    interface ScoreRecordRow {
      student_id: string
      score: number | null
      total_points: number | null
      percentage: number | null
      feedback: string | null
      students: {
        id: string
        student_code: string
        grade: string | null
        users: { name: string } | null
      } | null
    }

    const students: ExamAssignedStudent[] = []
    const scores: ExamAssignedScore[] = []

    for (const record of (scoreRecords || []) as unknown as ScoreRecordRow[]) {
      if (!record.students) continue
      students.push({
        id: record.students.id,
        student_code: record.students.student_code,
        name: record.students.users?.name || '이름 없음',
        grade: record.students.grade,
      })
      scores.push({
        student_id: record.student_id,
        score: record.score,
        total_points: record.total_points,
        percentage: record.percentage,
        feedback: record.feedback,
      })
    }

    return {
      success: true,
      data: { students, scores },
      error: null,
    }
  } catch (error) {
    console.error('[getExamAssignments] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Restore a previously-removed exam assignment, preserving the score data.
 * Used by the "undo" toast action after removing a student from the exam.
 */
export async function restoreExamAssignment(
  examId: string,
  studentId: string,
  scoreData: {
    score: number | null
    total_points: number | null
    percentage: number | null
  }
) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: examError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (examError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error: insertError } = await serviceClient
      .from('exam_scores')
      .insert({
        tenant_id: tenantId,
        exam_id: examId,
        student_id: studentId,
        score: scoreData.score,
        total_points: scoreData.total_points,
        percentage: scoreData.percentage,
      })

    if (insertError) throw insertError

    revalidatePath(`/grades/exams/${examId}`)
    revalidatePath('/grades/exams')
    revalidatePath('/grades')

    return { success: true, error: null }
  } catch (error) {
    console.error('[restoreExamAssignment] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Bulk-restore exam assignments, preserving each student's score data.
 * Used by the "되돌리기" toast after a bulk unassign action.
 */
export async function restoreExamAssignmentsBulk(
  examId: string,
  items: Array<{
    studentId: string
    score: number | null
    total_points: number | null
    percentage: number | null
  }>
) {
  try {
    if (items.length === 0) {
      return { success: true, error: null }
    }

    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data: exam, error: examError } = await serviceClient
      .from('exams')
      .select('id, tenant_id')
      .eq('id', examId)
      .maybeSingle()

    if (examError || !exam) {
      return { success: false, error: '시험을 찾을 수 없습니다' }
    }

    if (exam.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const { error: insertError } = await serviceClient
      .from('exam_scores')
      .insert(
        items.map((item) => ({
          tenant_id: tenantId,
          exam_id: examId,
          student_id: item.studentId,
          score: item.score,
          total_points: item.total_points,
          percentage: item.percentage,
        }))
      )

    if (insertError) throw insertError

    revalidatePath(`/grades/exams/${examId}`)
    revalidatePath('/grades/exams')
    revalidatePath('/grades')

    return { success: true, error: null }
  } catch (error) {
    console.error('[restoreExamAssignmentsBulk] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Get active enrollment student IDs for a class (used by exam assignment dialog)
 */
export async function getEnrolledStudentIdsForClass(classId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('class_enrollments')
      .select('student_id')
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('status', 'active')

    if (error) throw error

    return {
      success: true,
      data: (data || []).map((e) => e.student_id),
      error: null,
    }
  } catch (error) {
    console.error('[getEnrolledStudentIdsForClass] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Get classes for exam assignment
 *
 * @returns List of active classes or error
 */
export async function getClassesForExam() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Query classes
    const { data: classes, error } = await serviceClient
      .from('classes')
      .select('id, name, subject')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('[getClassesForExam] Query error:', error.message)
      throw new Error('수업 조회에 실패했습니다')
    }

    return {
      success: true,
      data: classes || [],
      error: null,
    }
  } catch (error) {
    console.error('[getClassesForExam] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
