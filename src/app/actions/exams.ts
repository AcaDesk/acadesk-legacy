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
        category_code: validated.category_code || null,
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

    // 4. Update exam
    const { error: updateError } = await serviceClient
      .from('exams')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)

    if (updateError) {
      throw updateError
    }

    // 5. Revalidate pages
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
export async function getExamCategories() {
  try {
    // No tenant verification needed for reference data

    // Create service_role client
    const serviceClient = createServiceRoleClient()

    // Query categories
    const { data: categories, error } = await serviceClient
      .from('ref_exam_categories')
      .select('code, label, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error) {
      throw new Error('카테고리 조회 실패: ' + error.message)
    }

    return {
      success: true,
      data: categories || [],
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
