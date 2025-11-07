/**
 * Exam Management Server Actions
 *
 * 모든 시험 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
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
        created_at,
        classes (
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('exam_date', { ascending: false })

    // 4. Apply filters
    if (filters?.classId && filters.classId !== 'all') {
      query = query.eq('class_id', filters.classId)
    }

    if (filters?.categoryCode && filters.categoryCode !== 'all') {
      query = query.eq('category_code', filters.categoryCode)
    }

    if (filters?.dateFrom) {
      query = query.gte('exam_date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('exam_date', filters.dateTo)
    }

    // 5. Execute query
    const { data: exams, error } = await query

    if (error) {
      throw new Error(`시험 조회 실패: ${error.message}`)
    }

    // 6. Get score counts for each exam
    const examsWithCounts = await Promise.all(
      (exams || []).map(async (exam) => {
        const { count } = await serviceClient
          .from('exam_scores')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id)

        return {
          ...exam,
          _count: { exam_scores: count || 0 },
        }
      })
    )

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
    const { data: exam, error } = await serviceClient
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name: validated.name,
        subject_id: validated.subject_id || null,
        category_code: validated.category_code && validated.category_code.trim() !== '' ? validated.category_code : null,
        exam_type: validated.exam_type || null,
        exam_date: validated.exam_date || null,
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
      throw new Error('시험 생성에 실패했습니다: ' + error?.message)
    }

    // 5. Revalidate pages
    revalidatePath('/grades/exams')
    revalidatePath('/grades')
    revalidatePath(`/grades/exams/${exam.id}`)

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
    const updateData: Record<string, any> = {
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
      throw new Error('수업 조회 실패: ' + error.message)
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
