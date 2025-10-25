/**
 * Textbook Progress Management Server Actions
 *
 * 교재 진도 기록 및 추적 관리
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

const addProgressSchema = z.object({
  studentId: z.string().uuid(),
  textbookId: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
  date: z.string().optional(), // ISO date string
  pagesDone: z.number().int().nonnegative().optional(),
  percentDone: z.number().min(0).max(100).optional(),
  memo: z.string().optional(),
})

const updateProgressSchema = z.object({
  id: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  pagesDone: z.number().int().nonnegative().optional().nullable(),
  percentDone: z.number().min(0).max(100).optional().nullable(),
  memo: z.string().optional().nullable(),
})

// ============================================================================
// Progress Management
// ============================================================================

/**
 * Add progress record
 *
 * IMPORTANT: Only records progress for textbooks with status='in_use'
 * This ensures progress is only tracked for currently active textbooks.
 *
 * @param input - Progress data
 * @returns Created progress record or error
 */
export async function addProgress(input: z.infer<typeof addProgressSchema>) {
  try {
    const validated = addProgressSchema.parse(input)
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // ✅ Validate that the student has this textbook with status='in_use'
    const { data: studentTextbook, error: checkError } = await supabase
      .from('student_textbooks')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('student_id', validated.studentId)
      .eq('textbook_id', validated.textbookId)
      .eq('status', 'in_use')
      .is('deleted_at', null)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (!studentTextbook) {
      throw new Error(
        '이 교재는 현재 사용 중(in_use)이 아닙니다. 진도 기록은 배부된 교재에만 가능합니다.'
      )
    }

    const { data, error } = await supabase
      .from('textbook_progress')
      .insert({
        tenant_id: tenantId,
        student_id: validated.studentId,
        textbook_id: validated.textbookId,
        unit_id: validated.unitId ?? null,
        date: validated.date || new Date().toISOString().split('T')[0],
        pages_done: validated.pagesDone ?? null,
        percent_done: validated.percentDone ?? null,
        memo: validated.memo || null,
        recorded_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath(`/students/${validated.studentId}`)
    revalidatePath(`/textbooks/${validated.textbookId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[addProgress] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update progress record
 *
 * @param input - Progress data with ID
 * @returns Updated progress record or error
 */
export async function updateProgress(
  input: z.infer<typeof updateProgressSchema>
) {
  try {
    const validated = updateProgressSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.unitId !== undefined) {
      updateData.unit_id = validated.unitId
    }
    if (validated.date !== undefined) {
      updateData.date = validated.date
    }
    if (validated.pagesDone !== undefined) {
      updateData.pages_done = validated.pagesDone
    }
    if (validated.percentDone !== undefined) {
      updateData.percent_done = validated.percentDone
    }
    if (validated.memo !== undefined) {
      updateData.memo = validated.memo
    }

    const { data, error } = await supabase
      .from('textbook_progress')
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
      throw new Error('진도 기록을 찾을 수 없습니다')
    }

    revalidatePath(`/students/${data.student_id}`)
    revalidatePath(`/textbooks/${data.textbook_id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateProgress] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete progress record (soft delete)
 *
 * @param id - Progress ID
 * @returns Success or error
 */
export async function deleteProgress(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get student_id and textbook_id for revalidation
    const { data: progress } = await supabase
      .from('textbook_progress')
      .select('student_id, textbook_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('textbook_progress')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    if (progress) {
      revalidatePath(`/students/${progress.student_id}`)
      revalidatePath(`/textbooks/${progress.textbook_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteProgress] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get student progress for a specific textbook
 *
 * @param studentId - Student ID
 * @param textbookId - Textbook ID
 * @param options - Query options
 * @returns Progress records or error
 */
export async function getStudentProgress(
  studentId: string,
  textbookId: string,
  options?: {
    startDate?: string
    endDate?: string
    limit?: number
  }
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('textbook_progress')
      .select(
        `
        *,
        textbook_units(id, unit_order, unit_code, unit_title),
        users!textbook_progress_recorded_by_fkey(id, name)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('textbook_id', textbookId)
      .is('deleted_at', null)

    if (options?.startDate) {
      query = query.gte('date', options.startDate)
    }
    if (options?.endDate) {
      query = query.lte('date', options.endDate)
    }

    query = query.order('date', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentProgress] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get progress summary for a student's textbook
 *
 * @param studentId - Student ID
 * @param textbookId - Textbook ID
 * @returns Progress summary or error
 */
export async function getProgressSummary(
  studentId: string,
  textbookId: string
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get all progress records
    const { data: progressRecords, error: progressError } = await supabase
      .from('textbook_progress')
      .select('pages_done, percent_done, date')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('textbook_id', textbookId)
      .is('deleted_at', null)
      .order('date', { ascending: true })

    if (progressError) {
      throw progressError
    }

    // Get textbook info
    const { data: textbook, error: textbookError } = await supabase
      .from('textbooks')
      .select('title')
      .eq('id', textbookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (textbookError) {
      throw textbookError
    }

    // Calculate summary
    const totalPages = progressRecords?.reduce(
      (sum, record) => sum + (record.pages_done || 0),
      0
    ) || 0

    const totalRecords = progressRecords?.length || 0
    const latestProgress = progressRecords?.[progressRecords.length - 1]
    const startDate = progressRecords?.[0]?.date
    const lastDate = latestProgress?.date

    return {
      success: true,
      data: {
        textbookTitle: textbook?.title,
        totalPages,
        totalRecords,
        latestPercentDone: latestProgress?.percent_done || null,
        startDate,
        lastDate,
        records: progressRecords || [],
      },
      error: null,
    }
  } catch (error) {
    console.error('[getProgressSummary] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get recent progress across all students
 *
 * @param options - Filter options
 * @returns Recent progress records or error
 */
export async function getRecentProgress(options?: {
  studentId?: string
  textbookId?: string
  limit?: number
  days?: number
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('textbook_progress')
      .select(
        `
        *,
        students!student_id(id, name),
        textbooks!textbook_id(id, title),
        textbook_units!unit_id(id, unit_order, unit_code, unit_title),
        users!textbook_progress_recorded_by_fkey(id, name)
      `
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (options?.studentId) {
      query = query.eq('student_id', options.studentId)
    }
    if (options?.textbookId) {
      query = query.eq('textbook_id', options.textbookId)
    }

    // Filter by date range if specified
    if (options?.days) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - options.days)
      query = query.gte('date', cutoffDate.toISOString().split('T')[0])
    }

    query = query.order('date', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getRecentProgress] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get progress by unit for a student's textbook
 * (Useful for visualizing which units are completed)
 *
 * @param studentId - Student ID
 * @param textbookId - Textbook ID
 * @returns Progress grouped by unit or error
 */
export async function getProgressByUnit(
  studentId: string,
  textbookId: string
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get all units for this textbook
    const { data: units, error: unitsError } = await supabase
      .from('textbook_units')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('textbook_id', textbookId)
      .is('deleted_at', null)
      .order('unit_order', { ascending: true })

    if (unitsError) {
      throw unitsError
    }

    // Get all progress records
    const { data: progressRecords, error: progressError } = await supabase
      .from('textbook_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('textbook_id', textbookId)
      .is('deleted_at', null)
      .order('date', { ascending: true })

    if (progressError) {
      throw progressError
    }

    // Group progress by unit
    const progressByUnit = units?.map((unit) => {
      const unitProgress = progressRecords?.filter(
        (record) => record.unit_id === unit.id
      ) || []

      const totalPages = unitProgress.reduce(
        (sum, record) => sum + (record.pages_done || 0),
        0
      )

      const latestRecord = unitProgress[unitProgress.length - 1]

      return {
        unit,
        totalPages,
        recordCount: unitProgress.length,
        latestPercentDone: latestRecord?.percent_done || null,
        lastDate: latestRecord?.date || null,
        records: unitProgress,
      }
    }) || []

    return {
      success: true,
      data: progressByUnit,
      error: null,
    }
  } catch (error) {
    console.error('[getProgressByUnit] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
