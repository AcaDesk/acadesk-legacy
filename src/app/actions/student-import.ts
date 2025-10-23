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

    const result: ImportConfirmResult = {
      total_processed: 0,
      created_count: 0,
      updated_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
    }

    // 각 학생을 처리
    for (let idx = 0; idx < validated.items.length; idx++) {
      const item = validated.items[idx]
      result.total_processed++

      try {
        // student_code 중복 확인
        let existing: { id: string } | null = null
        if (item.student.student_code) {
          const { data } = await serviceClient
            .from('students')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('student_code', item.student.student_code)
            .maybeSingle()

          existing = data as { id: string } | null
        }

        // 중복 처리
        if (existing) {
          if (validated.onDuplicate === 'skip') {
            result.skipped_count++
            continue
          } else {
            // Update
            const { error: updateError } = await serviceClient
              .from('students')
              .update({
                name: item.student.name,
                birth_date: item.student.birth_date || null,
                grade: item.student.grade || null,
                school: item.student.school || null,
                student_phone: item.student.student_phone || null,
                notes: item.student.notes || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            if (updateError) {
              throw updateError
            }

            result.updated_count++
          }
        } else {
          // Create new student
          const now = new Date().toISOString()

          // Generate student_code if not provided
          const student_code =
            item.student.student_code ||
            `STU-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

          const { error: insertError } = await serviceClient.from('students').insert({
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
          })

          if (insertError) {
            throw insertError
          }

          result.created_count++

          // TODO: 보호자 정보가 있으면 보호자도 생성
          // 현재는 학생만 생성
        }
      } catch (err) {
        result.error_count++
        result.errors.push({
          row: idx + 1,
          message: getErrorMessage(err),
        })
        console.error(`[confirmStudentImport] Error processing row ${idx + 1}:`, err)
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
