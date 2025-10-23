/**
 * Attendance Management Server Actions
 *
 * 모든 출석 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
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

const createSessionSchema = z.object({
  class_id: z.string().uuid('유효한 클래스 ID가 아닙니다'),
  session_date: z.string().min(1, '수업 날짜는 필수입니다'),
  scheduled_start_at: z.string().min(1, '시작 시간은 필수입니다'),
  scheduled_end_at: z.string().min(1, '종료 시간은 필수입니다'),
  notes: z.string().optional(),
})

const bulkUpsertAttendanceSchema = z.object({
  session_id: z.string().uuid('유효한 세션 ID가 아닙니다'),
  attendances: z.array(
    z.object({
      student_id: z.string().uuid('유효한 학생 ID가 아닙니다'),
      status: z.string().min(1, '출석 상태는 필수입니다'),
      check_in_at: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 출석 세션 생성
 * @param data - 세션 데이터
 * @returns 생성된 세션 또는 에러
 */
export async function createAttendanceSession(
  data: z.infer<typeof createSessionSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = createSessionSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert({
        tenant_id: tenantId,
        class_id: validatedData.class_id,
        session_date: validatedData.session_date,
        scheduled_start_at: validatedData.scheduled_start_at,
        scheduled_end_at: validatedData.scheduled_end_at,
        notes: validatedData.notes,
        status: 'scheduled',
      })
      .select(`
        *,
        class:classes(id, name)
      `)
      .single()

    if (error) {
      throw new Error(`출석 세션 생성 실패: ${error.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath('/attendance')

    return { success: true, data: session }
  } catch (error) {
    console.error('createAttendanceSession error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 출석 일괄 기록/수정
 * @param data - 출석 데이터 배열
 * @returns 생성/수정된 출석 기록 또는 에러
 */
export async function bulkUpsertAttendance(
  data: z.infer<typeof bulkUpsertAttendanceSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = bulkUpsertAttendanceSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 각 출석 기록을 upsert (session_id + student_id 기준)
    const records = validatedData.attendances.map((attendance) => ({
      tenant_id: tenantId,
      session_id: validatedData.session_id,
      student_id: attendance.student_id,
      status: attendance.status,
      check_in_at: attendance.check_in_at,
      notes: attendance.notes,
    }))

    const { data: attendanceRecords, error } = await supabase
      .from('attendance')
      .upsert(records, {
        onConflict: 'session_id,student_id',
      })
      .select()

    if (error) {
      throw new Error(`출석 기록 실패: ${error.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath(`/attendance/${validatedData.session_id}`)

    return { success: true, data: attendanceRecords }
  } catch (error) {
    console.error('bulkUpsertAttendance error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 출석 세션 삭제 (Soft Delete)
 * @param sessionId - 세션 ID
 * @returns 성공 여부
 */
export async function deleteAttendanceSession(sessionId: string) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('attendance_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`출석 세션 삭제 실패: ${error.message}`)
    }

    // 3. 캐시 무효화
    revalidatePath('/attendance')

    return { success: true }
  } catch (error) {
    console.error('deleteAttendanceSession error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
