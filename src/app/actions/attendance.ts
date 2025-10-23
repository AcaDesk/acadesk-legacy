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
 * 출석 세션 단건 조회
 * @param sessionId - 세션 ID
 * @returns 세션 또는 에러
 */
export async function getAttendanceSessionById(sessionId: string) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 3. 세션 조회
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        class:classes(
          id,
          name,
          subject
        )
      `)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getAttendanceSessionById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 특정 세션의 출석 기록 조회
 * @param sessionId - 세션 ID
 * @returns 출석 기록 목록 또는 에러
 */
export async function getAttendanceBySession(sessionId: string) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 3. 출석 기록 조회
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getAttendanceBySession] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 출석 세션 목록 조회
 * @param startDate - 시작 날짜 (선택)
 * @param endDate - 종료 날짜 (선택)
 * @param classId - 클래스 ID (선택)
 * @returns 세션 목록 또는 에러
 */
export async function getAttendanceSessions(params?: {
  startDate?: string
  endDate?: string
  classId?: string
}) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 3. 출석 세션 조회
    let query = supabase
      .from('attendance_sessions')
      .select(`
        *,
        class:classes(
          id,
          name,
          subject
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('session_date', { ascending: false })
      .order('scheduled_start_at', { ascending: false })

    // 날짜 필터
    if (params?.startDate) {
      query = query.gte('session_date', params.startDate)
    }
    if (params?.endDate) {
      query = query.lte('session_date', params.endDate)
    }

    // 클래스 필터
    if (params?.classId) {
      query = query.eq('class_id', params.classId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getAttendanceSessions] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

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

/**
 * 출석 세션 상태 업데이트
 * @param sessionId - 세션 ID
 * @param status - 새 상태 (scheduled, in_progress, completed, cancelled)
 * @param actualStartAt - 실제 시작 시간 (선택)
 * @param actualEndAt - 실제 종료 시간 (선택)
 * @returns 성공 여부
 */
export async function updateAttendanceSessionStatus(
  sessionId: string,
  status: string,
  actualStartAt?: string,
  actualEndAt?: string
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (actualStartAt) {
      updateData.actual_start_at = actualStartAt
    }
    if (actualEndAt) {
      updateData.actual_end_at = actualEndAt
    }

    const { error } = await supabase
      .from('attendance_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`세션 상태 업데이트 실패: ${error.message}`)
    }

    // 3. 캐시 무효화
    revalidatePath(`/attendance/${sessionId}`)
    revalidatePath('/attendance')

    return { success: true }
  } catch (error) {
    console.error('updateAttendanceSessionStatus error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 결석 학생 보호자에게 일괄 알림 전송
 * @param notifications - 알림 데이터 배열
 * @returns 전송 성공 개수
 */
export async function bulkNotifyAbsentStudents(
  notifications: Array<{
    student_id: string
    student_name: string
    session_id: string
    session_date: string
  }>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 각 학생의 보호자 정보를 가져와서 알림 생성
    let successCount = 0

    for (const notification of notifications) {
      try {
        // 학생의 보호자 찾기 (FK 힌트 사용)
        const { data: guardians, error: guardianError } = await supabase
          .from('student_guardians')
          .select(`
            guardian_id,
            guardians!student_guardians_guardian_id_fkey (
              user_id,
              users (
                id,
                name,
                phone
              )
            )
          `)
          .eq('student_id', notification.student_id)
          .eq('tenant_id', tenantId)
          .limit(1)

        if (guardianError || !guardians || guardians.length === 0) {
          console.warn(`No guardians found for student ${notification.student_id}`)
          continue
        }

        // 알림 생성 (notifications 테이블에 저장)
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            tenant_id: tenantId,
            user_id: (guardians[0].guardians as any).user_id,
            type: 'attendance_alert',
            title: '결석 알림',
            message: `${notification.student_name} 학생이 ${notification.session_date} 수업에 결석했습니다.`,
            metadata: {
              student_id: notification.student_id,
              session_id: notification.session_id,
              session_date: notification.session_date,
            },
          })

        if (!notificationError) {
          successCount++
        }
      } catch (err) {
        console.error(`Failed to notify for student ${notification.student_id}:`, err)
        // 개별 실패는 무시하고 계속 진행
      }
    }

    // 3. 캐시 무효화
    revalidatePath('/attendance')

    return { success: true, successCount }
  } catch (error) {
    console.error('bulkNotifyAbsentStudents error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      successCount: 0,
    }
  }
}
