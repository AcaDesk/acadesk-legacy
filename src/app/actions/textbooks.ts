/**
 * Textbook Management Server Actions
 *
 * 교재 관리의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * - 교재 마스터 관리 (textbooks)
 * - 교재 단원 관리 (textbook_units)
 * - 학생별 교재 배부 관리 (student_textbooks)
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

const createTextbookSchema = z.object({
  title: z.string().min(1, '교재명은 필수입니다'),
  publisher: z.string().optional(),
  isbn: z.string().optional(),
  price: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

const updateTextbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '교재명은 필수입니다').optional(),
  publisher: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  price: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
})

const createTextbookUnitSchema = z.object({
  textbookId: z.string().uuid(),
  unitOrder: z.number().int().positive(),
  unitCode: z.string().optional(),
  unitTitle: z.string().min(1, '단원명은 필수입니다'),
  totalPages: z.number().int().positive().optional(),
})

const updateTextbookUnitSchema = z.object({
  id: z.string().uuid(),
  unitOrder: z.number().int().positive().optional(),
  unitCode: z.string().optional().nullable(),
  unitTitle: z.string().min(1, '단원명은 필수입니다').optional(),
  totalPages: z.number().int().positive().optional().nullable(),
})

const assignTextbookSchema = z.object({
  studentId: z.string().uuid(),
  textbookId: z.string().uuid(),
  issueDate: z.string().optional(), // ISO date string
  paid: z.boolean().optional(),
  notes: z.string().optional(),
})

const updateStudentTextbookSchema = z.object({
  id: z.string().uuid(),
  paid: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['in_use', 'completed', 'returned']).optional(),
})

// ============================================================================
// Textbook Master Management
// ============================================================================

/**
 * Get all textbooks
 *
 * @param options - Filter options
 * @returns Textbook list or error
 */
export async function getTextbooks(options?: {
  activeOnly?: boolean
  includeUnits?: boolean
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('textbooks')
      .select(
        options?.includeUnits
          ? '*, textbook_units(*)'
          : '*'
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (options?.activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get a single textbook by ID
 *
 * @param id - Textbook ID
 * @param includeUnits - Include units in response
 * @returns Textbook or error
 */
export async function getTextbookById(id: string, includeUnits = true) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('textbooks')
      .select(
        includeUnits
          ? '*, textbook_units(*)'
          : '*'
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('교재를 찾을 수 없습니다')
    }

    // Filter out deleted units if included
    // TODO(types): Type will be available after migration is applied
    if (includeUnits && (data as any).textbook_units) {
      ;(data as any).textbook_units = (data as any).textbook_units
        .filter((unit: any) => !unit.deleted_at)
        .sort((a: any, b: any) => a.unit_order - b.unit_order)
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getTextbookById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new textbook
 *
 * @param input - Textbook data
 * @returns Created textbook or error
 */
export async function createTextbook(
  input: z.infer<typeof createTextbookSchema>
) {
  try {
    const validated = createTextbookSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('textbooks')
      .insert({
        tenant_id: tenantId,
        title: validated.title,
        publisher: validated.publisher || null,
        isbn: validated.isbn || null,
        price: validated.price ?? null,
        is_active: validated.isActive ?? true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createTextbook] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a textbook
 *
 * @param input - Textbook data with ID
 * @returns Updated textbook or error
 */
export async function updateTextbook(
  input: z.infer<typeof updateTextbookSchema>
) {
  try {
    const validated = updateTextbookSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.title !== undefined) {
      updateData.title = validated.title
    }
    if (validated.publisher !== undefined) {
      updateData.publisher = validated.publisher
    }
    if (validated.isbn !== undefined) {
      updateData.isbn = validated.isbn
    }
    if (validated.price !== undefined) {
      updateData.price = validated.price
    }
    if (validated.isActive !== undefined) {
      updateData.is_active = validated.isActive
    }

    const { data, error } = await supabase
      .from('textbooks')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('교재를 찾을 수 없습니다')
    }

    revalidatePath('/textbooks')
    revalidatePath(`/textbooks/${validated.id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateTextbook] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a textbook (soft delete)
 *
 * @param id - Textbook ID
 * @returns Success or error
 */
export async function deleteTextbook(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('textbooks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTextbook] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Textbook Units Management
// ============================================================================

/**
 * Create a new textbook unit
 *
 * @param input - Unit data
 * @returns Created unit or error
 */
export async function createTextbookUnit(
  input: z.infer<typeof createTextbookUnitSchema>
) {
  try {
    const validated = createTextbookUnitSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('textbook_units')
      .insert({
        tenant_id: tenantId,
        textbook_id: validated.textbookId,
        unit_order: validated.unitOrder,
        unit_code: validated.unitCode || null,
        unit_title: validated.unitTitle,
        total_pages: validated.totalPages ?? null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    revalidatePath(`/textbooks/${validated.textbookId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createTextbookUnit] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a textbook unit
 *
 * @param input - Unit data with ID
 * @returns Updated unit or error
 */
export async function updateTextbookUnit(
  input: z.infer<typeof updateTextbookUnitSchema>
) {
  try {
    const validated = updateTextbookUnitSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.unitOrder !== undefined) {
      updateData.unit_order = validated.unitOrder
    }
    if (validated.unitCode !== undefined) {
      updateData.unit_code = validated.unitCode
    }
    if (validated.unitTitle !== undefined) {
      updateData.unit_title = validated.unitTitle
    }
    if (validated.totalPages !== undefined) {
      updateData.total_pages = validated.totalPages
    }

    const { data, error } = await supabase
      .from('textbook_units')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('단원을 찾을 수 없습니다')
    }

    revalidatePath('/textbooks')
    revalidatePath(`/textbooks/${data.textbook_id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateTextbookUnit] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a textbook unit (soft delete)
 *
 * @param id - Unit ID
 * @returns Success or error
 */
export async function deleteTextbookUnit(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get textbook_id for revalidation before deleting
    const { data: unit } = await supabase
      .from('textbook_units')
      .select('textbook_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('textbook_units')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    if (unit?.textbook_id) {
      revalidatePath(`/textbooks/${unit.textbook_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTextbookUnit] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Student Textbook Assignment Management
// ============================================================================

/**
 * Assign a textbook to a student
 *
 * @param input - Assignment data
 * @returns Created assignment or error
 */
export async function assignTextbookToStudent(
  input: z.infer<typeof assignTextbookSchema>
) {
  try {
    const validated = assignTextbookSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('student_textbooks')
      .insert({
        tenant_id: tenantId,
        student_id: validated.studentId,
        textbook_id: validated.textbookId,
        issue_date: validated.issueDate || new Date().toISOString().split('T')[0],
        paid: validated.paid ?? false,
        notes: validated.notes || null,
        status: 'in_use',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    revalidatePath(`/students/${validated.studentId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[assignTextbookToStudent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update student textbook assignment
 *
 * @param input - Update data with ID
 * @returns Updated assignment or error
 */
export async function updateStudentTextbook(
  input: z.infer<typeof updateStudentTextbookSchema>
) {
  try {
    const validated = updateStudentTextbookSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.paid !== undefined) {
      updateData.paid = validated.paid
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes
    }
    if (validated.status !== undefined) {
      updateData.status = validated.status
    }

    const { data, error } = await supabase
      .from('student_textbooks')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('교재 배부 정보를 찾을 수 없습니다')
    }

    revalidatePath('/textbooks')
    revalidatePath(`/students/${data.student_id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateStudentTextbook] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete student textbook assignment (soft delete)
 *
 * @param id - Assignment ID
 * @returns Success or error
 */
export async function deleteStudentTextbook(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get student_id for revalidation
    const { data: assignment } = await supabase
      .from('student_textbooks')
      .select('student_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('student_textbooks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    if (assignment?.student_id) {
      revalidatePath(`/students/${assignment.student_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteStudentTextbook] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get textbooks assigned to a student
 *
 * @param studentId - Student ID
 * @param status - Filter by status (optional)
 * @returns Student textbook assignments or error
 */
export async function getStudentTextbooks(
  studentId: string,
  status?: 'in_use' | 'completed' | 'returned'
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('student_textbooks')
      .select('*, textbooks(*)')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .is('deleted_at', null)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('issue_date', {
      ascending: false,
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get unpaid textbooks (for payment tracking)
 *
 * @returns List of unpaid student textbooks or error
 */
export async function getUnpaidTextbooks() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('student_textbooks')
      .select('*, textbooks(*), students(name)')
      .eq('tenant_id', tenantId)
      .eq('paid', false)
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getUnpaidTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
