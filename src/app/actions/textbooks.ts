/**
 * Textbook Management Server Actions
 *
 * 교재 관리의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * - 교재 마스터 관리 (textbooks)
 * - 교재 단원 관리 (textbook_units)
 * - 학생별 교재 배부 관리 (student_textbooks)
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayKST } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createTextbookSchema = z.object({
  title: z.string().min(1, '교재명은 필수입니다'),
  author: z.string().optional(),
  publisher: z.string().optional(),
  isbn: z.string().optional(),
  barcode: z.string().optional(),
  managementCode: z.string().max(100).optional(),
  totalCopies: z.number().int().positive().optional(),
  price: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

const bulkCreateTextbookItemSchema = z.object({
  title: z.string().trim().min(1, '교재명은 필수입니다.').max(200),
  author: z.string().trim().max(100).optional().nullable(),
  publisher: z.string().trim().max(100).optional().nullable(),
  isbn: z.string().trim().max(50).optional().nullable(),
  barcode: z.string().trim().max(100).optional().nullable(),
  totalCopies: z.number().int().positive().optional().nullable(),
  managementCode: z.string().trim().max(100).optional().nullable(),
})

const bulkValidateTextbookItemSchema = bulkCreateTextbookItemSchema.extend({
  rowNumber: z.number().int().positive(),
})

const bulkCreateTextbooksSchema = z.object({
  textbooks: z.array(bulkCreateTextbookItemSchema).min(1, '등록할 교재가 없습니다.').max(1000),
})

const bulkValidateTextbooksSchema = z.object({
  textbooks: z.array(bulkValidateTextbookItemSchema).min(1, '검증할 교재가 없습니다.').max(1000),
})

const updateTextbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '교재명은 필수입니다').optional(),
  publisher: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  managementCode: z.string().max(100).nullable().optional(),
  totalCopies: z.number().int().positive().optional().nullable(),
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
  search?: string
  page?: number
  pageSize?: number
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const shouldPaginate = Boolean(options?.page && options?.pageSize)

    let query = supabase
      .from('textbooks')
      .select('*', { count: shouldPaginate ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (options?.activeOnly) {
      query = query.eq('is_active', true)
    }

    if (options?.search?.trim()) {
      const term = options.search.trim().slice(0, 100)
      const safeTerm = term.replace(/[%_\\]/g, '\\$&')
      query = query.or([
        `title.ilike.%${safeTerm}%`,
        `author.ilike.%${safeTerm}%`,
        `publisher.ilike.%${safeTerm}%`,
        `barcode.ilike.%${safeTerm}%`,
        `isbn.ilike.%${safeTerm}%`,
        `management_code.ilike.%${safeTerm}%`,
      ].join(','))
    }

    if (shouldPaginate && options?.page && options?.pageSize) {
      const from = (options.page - 1) * options.pageSize
      const to = from + options.pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      throw error
    }

    const textbooks = data || []
    const textbookIds = textbooks.map(t => t.id as string)

    // 대출 수 / 단원 수 조회 (현재 페이지 교재 한정)
    const lendingCountByTextbookId: Record<string, number> = {}
    const unitCountByTextbookId: Record<string, number> = {}

    if (textbookIds.length > 0) {
      const [{ data: lendings }, { data: units }] = await Promise.all([
        supabase
          .from('book_lendings')
          .select('textbook_id')
          .eq('tenant_id', tenantId)
          .in('textbook_id', textbookIds)
          .is('returned_at', null),
        supabase
          .from('textbook_units')
          .select('textbook_id')
          .eq('tenant_id', tenantId)
          .in('textbook_id', textbookIds)
          .is('deleted_at', null),
      ])

      for (const row of lendings || []) {
        const id = row.textbook_id as string
        lendingCountByTextbookId[id] = (lendingCountByTextbookId[id] || 0) + 1
      }
      for (const row of units || []) {
        const id = row.textbook_id as string
        unitCountByTextbookId[id] = (unitCountByTextbookId[id] || 0) + 1
      }
    }

    return {
      success: true,
      data: textbooks,
      lendingCountByTextbookId,
      unitCountByTextbookId,
      totalCount: count ?? textbooks.length,
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? textbooks.length,
      error: null,
    }
  } catch (error) {
    console.error('[getTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      lendingCountByTextbookId: {},
      unitCountByTextbookId: {},
      totalCount: 0,
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 0,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Bulk create textbooks
 *
 * @param input - Array of textbook data
 * @returns Insert result with counts
 */
export async function bulkCreateTextbooks(
  input: z.infer<typeof bulkCreateTextbooksSchema>
) {
  try {
    const validated = bulkCreateTextbooksSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const normalized = validated.textbooks.map((item) => ({
      title: item.title.trim(),
      author: item.author?.trim() || null,
      publisher: item.publisher?.trim() || null,
      isbn: item.isbn?.trim() || null,
      barcode: item.barcode?.trim() || null,
      management_code: item.managementCode?.trim() || null,
      total_copies: item.totalCopies || 1,
    }))

    // Check for duplicate barcodes
    const barcodes = normalized
      .map((item) => item.barcode)
      .filter((code): code is string => Boolean(code))

    const dedupedBarcodes = Array.from(new Set(barcodes))

    let existingBarcodeSet = new Set<string>()
    if (dedupedBarcodes.length > 0) {
      const { data: existing, error: existingError } = await supabase
        .from('textbooks')
        .select('barcode')
        .eq('tenant_id', tenantId)
        .in('barcode', dedupedBarcodes)
        .is('deleted_at', null)

      if (existingError) throw existingError

      existingBarcodeSet = new Set(
        (existing || [])
          .map((item) => item.barcode)
          .filter((code): code is string => Boolean(code))
      )
    }

    const inputBarcodeSet = new Set<string>()
    const duplicateBarcodes: string[] = []
    const rowsToInsert: Array<{
      tenant_id: string
      title: string
      author: string | null
      publisher: string | null
      isbn: string | null
      barcode: string | null
      management_code: string | null
      total_copies: number
    }> = []

    for (const item of normalized) {
      const barcode = item.barcode

      if (barcode) {
        if (existingBarcodeSet.has(barcode) || inputBarcodeSet.has(barcode)) {
          duplicateBarcodes.push(barcode)
          continue
        }
        inputBarcodeSet.add(barcode)
      }

      rowsToInsert.push({
        tenant_id: tenantId,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        isbn: item.isbn,
        barcode: item.barcode,
        management_code: item.management_code,
        total_copies: item.total_copies,
      })
    }

    if (rowsToInsert.length === 0) {
      return {
        success: true,
        data: {
          insertedCount: 0,
          skippedCount: normalized.length,
          duplicateBarcodes: Array.from(new Set(duplicateBarcodes)),
        },
        error: null,
      }
    }

    const { error: insertError } = await supabase
      .from('textbooks')
      .insert(rowsToInsert)
    if (insertError) throw insertError

    revalidatePath('/textbooks')
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

    return {
      success: true,
      data: {
        insertedCount: rowsToInsert.length,
        skippedCount: normalized.length - rowsToInsert.length,
        duplicateBarcodes: Array.from(new Set(duplicateBarcodes)),
      },
      error: null,
    }
  } catch (error) {
    console.error('[bulkCreateTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Bulk validate textbooks before insert
 *
 * @param input - Array of textbook data with rowNumber
 * @returns Validation result (DB duplicate checks included)
 */
export async function validateBulkTextbooks(
  input: z.infer<typeof bulkValidateTextbooksSchema>
) {
  function shouldSkipDuplicateCheck(error: unknown): boolean {
    const code = (error as { code?: string } | null)?.code
    const message = ((error as { message?: string } | null)?.message || '').toLowerCase()

    // Postgres / PostgREST 컬럼 누락 계열
    if (code === '42703' || code === 'PGRST204') return true
    if (message.includes('column') && (message.includes('isbn') || message.includes('barcode'))) {
      return true
    }
    return false
  }

  try {
    const validated = bulkValidateTextbooksSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const normalized = validated.textbooks.map((item) => ({
      rowNumber: item.rowNumber,
      title: item.title.trim(),
      author: item.author?.trim() || null,
      publisher: item.publisher?.trim() || null,
      isbn: item.isbn?.trim() || null,
      barcode: item.barcode?.trim() || null,
      management_code: item.managementCode?.trim() || null,
      total_copies: item.totalCopies || 1,
    }))

    const barcodes = normalized
      .map((item) => item.barcode)
      .filter((code): code is string => Boolean(code))
    const isbns = normalized
      .map((item) => item.isbn)
      .filter((code): code is string => Boolean(code))
    const managementCodes = normalized
      .map((item) => item.management_code)
      .filter((code): code is string => Boolean(code))

    const dedupedBarcodes = Array.from(new Set(barcodes))
    const dedupedIsbns = Array.from(new Set(isbns))
    const dedupedManagementCodes = Array.from(new Set(managementCodes))

    const existingBarcodeSet = new Set<string>()
    const existingIsbnSet = new Set<string>()
    const existingManagementCodeSet = new Set<string>()
    const validationWarnings: string[] = []

    if (dedupedBarcodes.length > 0) {
      const { data, error } = await supabase
        .from('textbooks')
        .select('barcode')
        .eq('tenant_id', tenantId)
        .in('barcode', dedupedBarcodes)
        .is('deleted_at', null)
      if (error) {
        if (shouldSkipDuplicateCheck(error)) {
          validationWarnings.push('바코드 중복 검사를 건너뛰었습니다. (스키마/환경 확인 필요)')
        } else {
          throw error
        }
      } else {
        for (const row of data || []) {
          if (row.barcode) existingBarcodeSet.add(row.barcode)
        }
      }
    }

    if (dedupedIsbns.length > 0) {
      const { data, error } = await supabase
        .from('textbooks')
        .select('isbn')
        .eq('tenant_id', tenantId)
        .in('isbn', dedupedIsbns)
        .is('deleted_at', null)
      if (error) {
        if (shouldSkipDuplicateCheck(error)) {
          validationWarnings.push('ISBN 중복 검사를 건너뛰었습니다. (스키마/환경 확인 필요)')
        } else {
          throw error
        }
      } else {
        for (const row of data || []) {
          if (row.isbn) existingIsbnSet.add(row.isbn)
        }
      }
    }

    if (dedupedManagementCodes.length > 0) {
      const { data, error } = await supabase
        .from('textbooks')
        .select('management_code')
        .eq('tenant_id', tenantId)
        .in('management_code', dedupedManagementCodes)
        .is('deleted_at', null)
      if (error) {
        if (shouldSkipDuplicateCheck(error)) {
          validationWarnings.push('관리번호 중복 검사를 건너뛰었습니다. (스키마/환경 확인 필요)')
        } else {
          throw error
        }
      } else {
        for (const row of data || []) {
          const code = (row as { management_code?: string | null }).management_code
          if (code) existingManagementCodeSet.add(code)
        }
      }
    }

    const inputBarcodeRows = new Map<string, number[]>()
    const inputIsbnRows = new Map<string, number[]>()
    const inputManagementCodeRows = new Map<string, number[]>()

    for (const item of normalized) {
      if (item.barcode) {
        const list = inputBarcodeRows.get(item.barcode) || []
        list.push(item.rowNumber)
        inputBarcodeRows.set(item.barcode, list)
      }
      if (item.isbn) {
        const list = inputIsbnRows.get(item.isbn) || []
        list.push(item.rowNumber)
        inputIsbnRows.set(item.isbn, list)
      }
      if (item.management_code) {
        const list = inputManagementCodeRows.get(item.management_code) || []
        list.push(item.rowNumber)
        inputManagementCodeRows.set(item.management_code, list)
      }
    }

    const rows = normalized.map((item) => {
      const errors: string[] = []
      const warnings: string[] = []

      if (!Number.isInteger(item.total_copies) || item.total_copies < 1) {
        errors.push('보유수는 1 이상의 정수여야 합니다.')
      }

      if (item.barcode) {
        const duplicateInputRows = inputBarcodeRows.get(item.barcode) || []
        if (duplicateInputRows.length > 1) {
          errors.push(`입력 내 중복 바코드 (행: ${duplicateInputRows.join(', ')})`)
        }
        if (existingBarcodeSet.has(item.barcode)) {
          errors.push('기존 데이터와 바코드 중복')
        }
      }

      if (item.isbn) {
        const duplicateInputRows = inputIsbnRows.get(item.isbn) || []
        if (duplicateInputRows.length > 1) {
          warnings.push(`입력 내 중복 ISBN (행: ${duplicateInputRows.join(', ')})`)
        }
        if (existingIsbnSet.has(item.isbn)) {
          warnings.push('기존 데이터와 ISBN 중복')
        }
      }

      if (item.management_code) {
        const duplicateInputRows = inputManagementCodeRows.get(item.management_code) || []
        if (duplicateInputRows.length > 1) {
          errors.push(`입력 내 중복 관리번호 (행: ${duplicateInputRows.join(', ')})`)
        }
        if (existingManagementCodeSet.has(item.management_code)) {
          errors.push('기존 데이터와 관리번호 중복')
        }
      }

      return {
        rowNumber: item.rowNumber,
        errors,
        warnings,
        canInsert: errors.length === 0,
      }
    })

    const blockedRows = rows.filter((row) => !row.canInsert).length

    return {
      success: true,
      data: {
        rows,
        blockedRows,
        validationWarnings,
      },
      error: null,
    }
  } catch (error) {
    console.error('[validateBulkTextbooks] Error:', error)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (includeUnits && (data as any).textbook_units) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(data as any).textbook_units = (data as any).textbook_units
        .filter((unit: { deleted_at: string | null }) => !unit.deleted_at)
        .sort((a: { unit_order: number }, b: { unit_order: number }) => a.unit_order - b.unit_order)
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
        author: validated.author || null,
        publisher: validated.publisher || null,
        isbn: validated.isbn || null,
        barcode: validated.barcode || null,
        management_code: validated.managementCode || null,
        total_copies: validated.totalCopies || 1,
        price: validated.price ?? null,
        is_active: validated.isActive ?? true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

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
    if (validated.managementCode !== undefined) {
      updateData.management_code = validated.managementCode
    }
    if (validated.totalCopies !== undefined) {
      updateData.total_copies = validated.totalCopies
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
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

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
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

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

/**
 * Delete multiple textbooks (soft delete)
 *
 * @param ids - Array of Textbook IDs
 * @returns Success with deleted count or error
 */
export async function bulkDeleteTextbooks(ids: string[]) {
  try {
    if (ids.length === 0) {
      return { success: true, data: { deletedCount: 0 }, error: null }
    }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('textbooks')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id')

    if (error) {
      throw error
    }

    revalidatePath('/textbooks')
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

    return {
      success: true,
      data: { deletedCount: data?.length ?? 0 },
      error: null,
    }
  } catch (error) {
    console.error('[bulkDeleteTextbooks] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

const updateTextbookWithUnitsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, '교재명은 필수입니다').optional(),
  publisher: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  managementCode: z.string().max(100).nullable().optional(),
  totalCopies: z.number().int().positive().optional().nullable(),
  price: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
  units: z.array(
    z.discriminatedUnion('op', [
      z.object({
        op: z.literal('delete'),
        id: z.string().uuid(),
      }),
      z.object({
        op: z.literal('update'),
        id: z.string().uuid(),
        unitOrder: z.number().int().positive().optional(),
        unitCode: z.string().optional().nullable(),
        unitTitle: z.string().min(1, '단원명은 필수입니다').optional(),
        totalPages: z.number().int().positive().optional().nullable(),
      }),
      z.object({
        op: z.literal('create'),
        unitOrder: z.number().int().positive(),
        unitCode: z.string().optional(),
        unitTitle: z.string().min(1, '단원명은 필수입니다'),
        totalPages: z.number().int().positive().optional(),
      }),
    ])
  ).optional(),
})

/**
 * Update a textbook and its units in a single server action call.
 * Runs all unit operations in parallel after updating the textbook.
 */
export async function updateTextbookWithUnits(
  input: z.infer<typeof updateTextbookWithUnitsSchema>
) {
  try {
    const validated = updateTextbookWithUnitsSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    // 1. Update textbook basic info
    const updateData: Record<string, unknown> = { updated_at: now }
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.publisher !== undefined) updateData.publisher = validated.publisher
    if (validated.isbn !== undefined) updateData.isbn = validated.isbn
    if (validated.managementCode !== undefined) updateData.management_code = validated.managementCode
    if (validated.totalCopies !== undefined) updateData.total_copies = validated.totalCopies
    if (validated.price !== undefined) updateData.price = validated.price
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive

    const { data, error } = await supabase
      .from('textbooks')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('교재를 찾을 수 없습니다')

    // 2. Run all unit operations in parallel
    if (validated.units && validated.units.length > 0) {
      await Promise.all(
        validated.units.map((unit) => {
          if (unit.op === 'delete') {
            return supabase
              .from('textbook_units')
              .update({ deleted_at: now })
              .eq('id', unit.id)
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          }
          if (unit.op === 'update') {
            const d: Record<string, unknown> = { updated_at: now }
            if (unit.unitOrder !== undefined) d.unit_order = unit.unitOrder
            if (unit.unitCode !== undefined) d.unit_code = unit.unitCode
            if (unit.unitTitle !== undefined) d.unit_title = unit.unitTitle
            if (unit.totalPages !== undefined) d.total_pages = unit.totalPages
            return supabase
              .from('textbook_units')
              .update(d)
              .eq('id', unit.id)
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          }
          // op === 'create'
          return supabase.from('textbook_units').insert({
            tenant_id: tenantId,
            textbook_id: validated.id,
            unit_order: unit.unitOrder,
            unit_code: unit.unitCode || null,
            unit_title: unit.unitTitle,
            total_pages: unit.totalPages ?? null,
          })
        })
      )
    }

    // 3. Revalidate once at the end
    revalidatePath('/textbooks')
    revalidatePath(`/textbooks/${validated.id}`)
    revalidatePath('/library/lendings')
    revalidateTag('library-form-options')

    return { success: true, data, error: null }
  } catch (error) {
    console.error('[updateTextbookWithUnits] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
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
        issue_date: validated.issueDate || getTodayKST(),
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
    revalidatePath(`/textbooks/${validated.textbookId}`)
    revalidatePath(`/students/${validated.studentId}`)
    revalidateTag('textbook-distributions')

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
    revalidatePath(`/textbooks/${data.textbook_id}`)
    revalidatePath(`/students/${data.student_id}`)
    revalidateTag('textbook-distributions')

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

    // Get student_id and textbook_id for revalidation
    const { data: assignment } = await supabase
      .from('student_textbooks')
      .select('student_id, textbook_id')
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
    if (assignment?.textbook_id) {
      revalidatePath(`/textbooks/${assignment.textbook_id}`)
      revalidateTag('textbook-distributions')
    }
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
 * Get textbook usage: student_textbooks(배부) + active book_lendings(대출중)
 *
 * @param textbookId - Textbook ID
 * @returns Unified list of distributions and active loans, or error
 */
export async function getTextbookDistributions(textbookId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const [assignmentsResult, lendingsResult] = await Promise.all([
      supabase
        .from('student_textbooks')
        .select('id, issue_date, paid, status, notes, students!student_textbooks_student_fk(id, name, student_code, grade)')
        .eq('tenant_id', tenantId)
        .eq('textbook_id', textbookId)
        .is('deleted_at', null)
        .order('issue_date', { ascending: false }),
      supabase
        .from('book_lendings')
        .select('id, borrowed_at, due_date, students(id, student_code, users(name), grade)')
        .eq('tenant_id', tenantId)
        .eq('textbook_id', textbookId)
        .is('returned_at', null)
        .order('borrowed_at', { ascending: false }),
    ])

    if (assignmentsResult.error) throw assignmentsResult.error
    if (lendingsResult.error) throw lendingsResult.error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (assignmentsResult.data || []).map((row: any) => ({
      id: row.id as string,
      source: 'assignment' as const,
      date: row.issue_date as string,
      paid: row.paid as boolean,
      status: row.status as 'in_use' | 'completed' | 'returned',
      notes: row.notes as string | null,
      due_date: null as string | null,
      students: row.students as { id: string; name: string; student_code: string | null; grade: string | null } | null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lendings = (lendingsResult.data || []).map((row: any) => ({
      id: row.id as string,
      source: 'lending' as const,
      date: row.borrowed_at as string,
      paid: false,
      status: 'in_use' as const,
      notes: null as string | null,
      due_date: row.due_date as string | null,
      students: row.students
        ? {
            id: row.students.id as string,
            name: (row.students.users?.name ?? '') as string,
            student_code: row.students.student_code as string | null,
            grade: row.students.grade as string | null,
          }
        : null,
    }))

    return { success: true, data: [...assignments, ...lendings], error: null }
  } catch (error) {
    console.error('[getTextbookDistributions] Error:', error)
    return { success: false, data: null, error: getErrorMessage(error) }
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
      .select('*, textbooks!student_textbooks_textbook_fk(*)')
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
      .select('*, textbooks!student_textbooks_textbook_fk(*), students!student_textbooks_student_fk(name)')
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
