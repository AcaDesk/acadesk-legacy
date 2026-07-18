/**
 * Student Import Server Actions
 *
 * ⚠️ Service Role 기반: RPC 함수를 제거하고 직접 구현
 *
 * 기존 RPC 함수:
 * - preview_student_import → previewStudentImport()
 * - confirm_student_import → confirmStudentImport()
 */

'use server'

import { z } from 'zod'
import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { checkStudentQuota, quotaExceededMessage } from '@/lib/billing/plan-limits'

// ============================================================================
// Types
// ============================================================================

export interface GuardianImportData {
  emergency_phone: string
  relationship?: string
  is_primary?: boolean
  can_pickup?: boolean
  can_view_reports?: boolean
}

export interface StudentImportData {
  name: string
  birth_date: string // YYYY-MM-DD
  grade?: string
  school?: string
  student_phone?: string
  student_code?: string
  notes?: string
}

export interface StudentImportItem {
  student: StudentImportData
  guardians: GuardianImportData[]
}

export interface StudentImportPreview {
  total: number
  new_count: number
  duplicate_count: number
  error_count: number
  duplicates: Array<{
    row: number
    student_code: string
    name: string
    reason: string
  }>
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

export interface ImportConfirmResult {
  total_processed: number
  created_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  errors: Array<{
    row: number
    message: string
  }>
}

// ============================================================================
// Validation
// ============================================================================

const guardianImportDataSchema = z.object({
  emergency_phone: z.string(),
  relationship: z.string().optional(),
  is_primary: z.boolean().optional(),
  can_pickup: z.boolean().optional(),
  can_view_reports: z.boolean().optional(),
})

const studentImportDataSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  birth_date: z.string(),
  grade: z.string().optional(),
  school: z.string().optional(),
  student_phone: z.string().optional(),
  student_code: z.string().optional(),
  notes: z.string().optional(),
})

const studentImportItemSchema = z.object({
  student: studentImportDataSchema,
  guardians: z.array(guardianImportDataSchema),
})

const previewImportSchema = z.object({
  items: z.array(studentImportItemSchema),
})

const confirmImportSchema = z.object({
  items: z.array(studentImportItemSchema),
  onDuplicate: z.enum(['skip', 'update']).default('skip'),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 학생 임포트 미리보기
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * @param input - 임포트할 학생 데이터 배열
 * @returns 미리보기 결과 (중복, 에러 등)
 */
export async function previewStudentImport(input: z.infer<typeof previewImportSchema>) {
  const requestId = crypto.randomUUID()

  try {
    // 1. Validate input
    const validated = previewImportSchema.parse(input)

    console.log('[previewStudentImport] Request started:', {
      requestId,
      itemCount: validated.items.length,
    })

    // 2. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    const { tenant_id } = permissionResult.data

    // 3. Service role로 중복 확인
    const serviceClient = createServiceRoleClient()

    const preview: StudentImportPreview = {
      total: validated.items.length,
      new_count: 0,
      duplicate_count: 0,
      error_count: 0,
      duplicates: [],
      errors: [],
    }

    // 학생 코드 중복 확인
    const studentCodes = validated.items
      .map((item, idx) => ({ code: item.student.student_code, idx }))
      .filter((item) => item.code)

    if (studentCodes.length > 0) {
      const { data: existingStudents } = await serviceClient
        .from('students')
        .select('student_code, name')
        .eq('tenant_id', tenant_id)
        .in(
          'student_code',
          studentCodes.map((s) => s.code)
        )

      if (existingStudents && existingStudents.length > 0) {
        const existingCodesMap = new Map(
          existingStudents.map((s) => [s.student_code, s.name])
        )

        studentCodes.forEach(({ code, idx }) => {
          if (code && existingCodesMap.has(code)) {
            preview.duplicate_count++
            preview.duplicates.push({
              row: idx + 1,
              student_code: code,
              name: validated.items[idx].student.name,
              reason: `학생 코드 '${code}'가 이미 존재합니다 (기존: ${existingCodesMap.get(code)})`,
            })
          }
        })
      }
    }

    // Validation 에러 확인
    validated.items.forEach((item, idx) => {
      if (!item.student.name || item.student.name.trim().length === 0) {
        preview.error_count++
        preview.errors.push({
          row: idx + 1,
          field: 'name',
          message: '이름은 필수 항목입니다',
        })
      }

      // Guardian validation can be added here if needed
    })

    preview.new_count = preview.total - preview.duplicate_count - preview.error_count

    console.log('[previewStudentImport] Preview completed:', {
      requestId,
      preview,
    })

    return {
      success: true,
      data: preview,
    }
  } catch (error) {
    console.error('[previewStudentImport] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 학생 임포트 확정 실행
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * @param input - 임포트할 학생 데이터 및 옵션
 * @returns 임포트 결과
 */
export async function confirmStudentImport(input: z.infer<typeof confirmImportSchema>) {
  const requestId = crypto.randomUUID()

  try {
    // 1. Validate input
    const validated = confirmImportSchema.parse(input)

    console.log('[confirmStudentImport] Request started:', {
      requestId,
      itemCount: validated.items.length,
      onDuplicate: validated.onDuplicate,
    })

    // 2. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    const { tenant_id } = permissionResult.data

    // 3. Service role로 학생 생성
    const serviceClient = createServiceRoleClient()

    // 3-1. 플랜 학생 수 한도 확인 (SaaS 게이팅) — 신규 생성분 기준 최대치로 사전 검증
    const quota = await checkStudentQuota(serviceClient, tenant_id, validated.items.length)
    if (!quota.allowed) {
      return {
        success: false,
        error: quotaExceededMessage(quota, validated.items.length),
      }
    }

    const result: ImportConfirmResult = {
      total_processed: validated.items.length,
      created_count: 0,
      updated_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
    }

    // 1. 배치 조회: 모든 student_code의 기존 학생을 한 번에 확인
    const studentCodes = validated.items
      .map(item => item.student.student_code)
      .filter((code): code is string => !!code)

    const existingStudentsMap = new Map<string, string>()

    if (studentCodes.length > 0) {
      const { data: existingStudents } = await serviceClient
        .from('students')
        .select('id, student_code')
        .eq('tenant_id', tenant_id)
        .in('student_code', studentCodes)

      for (const student of existingStudents || []) {
        existingStudentsMap.set(student.student_code, student.id)
      }
    }

    // 2. 항목 분류: 업데이트 vs 생성 vs 스킵
    const now = new Date().toISOString()
    const itemsToUpdate: Array<{ idx: number; id: string; item: typeof validated.items[0] }> = []
    const itemsToCreate: Array<{ idx: number; item: typeof validated.items[0]; student_code: string }> = []

    for (let idx = 0; idx < validated.items.length; idx++) {
      const item = validated.items[idx]
      const existingId = item.student.student_code
        ? existingStudentsMap.get(item.student.student_code)
        : undefined

      if (existingId) {
        if (validated.onDuplicate === 'skip') {
          result.skipped_count++
        } else {
          itemsToUpdate.push({ idx, id: existingId, item })
        }
      } else {
        const student_code =
          item.student.student_code ||
          `STU-${Date.now()}-${idx}-${Math.random().toString(36).substring(7).toUpperCase()}`
        itemsToCreate.push({ idx, item, student_code })
      }
    }

    // 3. 병렬 업데이트 (Promise.allSettled로 개별 에러 추적)
    if (itemsToUpdate.length > 0) {
      const updateResults = await Promise.allSettled(
        itemsToUpdate.map(({ id, item }) =>
          serviceClient
            .from('students')
            .update({
              name: item.student.name,
              birth_date: item.student.birth_date || null,
              grade: item.student.grade || null,
              school: item.student.school || null,
              student_phone: item.student.student_phone || null,
              notes: item.student.notes || null,
              updated_at: now,
            })
            .eq('id', id)
        )
      )

      updateResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && !res.value.error) {
          result.updated_count++
        } else {
          result.error_count++
          const errMsg = res.status === 'rejected'
            ? getErrorMessage(res.reason)
            : getErrorMessage(res.value.error)
          result.errors.push({ row: itemsToUpdate[i].idx + 1, message: errMsg })
        }
      })
    }

    // 4. 배치 생성 (에러 발생 시 개별 처리로 폴백)
    if (itemsToCreate.length > 0) {
      const insertData = itemsToCreate.map(({ item, student_code }) => ({
        tenant_id,
        student_code,
        name: item.student.name,
        birth_date: item.student.birth_date || null,
        grade: item.student.grade || null,
        school: item.student.school || null,
        student_phone: item.student.student_phone || null,
        notes: item.student.notes || null,
        created_at: now,
        updated_at: now,
      }))

      const { error: batchInsertError } = await serviceClient
        .from('students')
        .insert(insertData)

      if (batchInsertError) {
        // 배치 실패 시 개별 삽입으로 폴백
        console.warn('[confirmStudentImport] Batch insert failed, falling back to individual inserts')
        const insertResults = await Promise.allSettled(
          insertData.map(data => serviceClient.from('students').insert(data))
        )

        insertResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && !res.value.error) {
            result.created_count++
          } else {
            result.error_count++
            const errMsg = res.status === 'rejected'
              ? getErrorMessage(res.reason)
              : getErrorMessage(res.value.error)
            result.errors.push({ row: itemsToCreate[i].idx + 1, message: errMsg })
          }
        })
      } else {
        result.created_count = itemsToCreate.length
      }
    }

    console.log('[confirmStudentImport] Import completed:', {
      requestId,
      result,
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('[confirmStudentImport] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
