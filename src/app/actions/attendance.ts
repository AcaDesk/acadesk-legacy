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

const findOrCreateSessionSchema = z.object({
  class_id: z.string().uuid('유효한 클래스 ID가 아닙니다'),
  session_date: z.string().min(1, '날짜는 필수입니다'),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 날짜 + 클래스 기준으로 세션 조회 또는 생성
 * @param data - class_id, session_date
 * @returns 세션 또는 에러
 */
export async function findOrCreateSession(
  data: z.infer<typeof findOrCreateSessionSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = findOrCreateSessionSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = createServiceRoleClient()

    // 4. 기존 세션 조회
    const { data: existingSession, error: selectError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('class_id', validatedData.class_id)
      .eq('session_date', validatedData.session_date)
      .is('deleted_at', null)
      .maybeSingle()

    if (selectError) throw selectError

    // 5. 세션이 이미 존재하면 반환
    if (existingSession) {
      return { success: true, data: existingSession }
    }

    // 6. 세션이 없으면 생성 (기본 시간 설정)
    const sessionDate = new Date(validatedData.session_date)
    const startTime = new Date(sessionDate)
    startTime.setHours(9, 0, 0, 0)
    const endTime = new Date(sessionDate)
    endTime.setHours(18, 0, 0, 0)

    const { data: newSession, error: insertError } = await supabase
      .from('attendance_sessions')
      .insert({
        tenant_id: tenantId,
        class_id: validatedData.class_id,
        session_date: validatedData.session_date,
        scheduled_start_at: startTime.toISOString(),
        scheduled_end_at: endTime.toISOString(),
        status: 'in_progress',
      })
      .select()
      .single()

    if (insertError) throw insertError

    revalidatePath('/attendance')

    return { success: true, data: newSession }
  } catch (error) {
    console.error('findOrCreateSession error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 날짜 + 클래스 기준으로 출석 데이터 조회 (UI용)
 *
 * 등록 학생을 먼저 조회하고, attendance 테이블의 attendance_date 컬럼으로 직접 조회.
 * 세션 테이블에 의존하지 않으므로 세션 미존재 시에도 정상 동작.
 *
 * @param date - 날짜 (YYYY-MM-DD)
 * @param classId - 클래스 ID (optional, 전체면 생략)
 * @returns 학생별 출석 현황
 */
export async function getAttendanceByDate(params: {
  date: string
  classId?: string
}) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = createServiceRoleClient()

    // 3. 등록 학생 조회 (classId 필터 기반)
    let enrollmentsQuery = supabase
      .from('class_enrollments')
      .select(`
        class_id,
        student_id,
        students!inner (
          id,
          student_code,
          grade,
          school_name,
          users!inner (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (params.classId) {
      enrollmentsQuery = enrollmentsQuery.eq('class_id', params.classId)
    }

    const { data: enrollments, error: enrollmentError } = await enrollmentsQuery

    if (enrollmentError) throw enrollmentError

    // 4. 등록 학생이 없으면 빈 결과 반환
    if (!enrollments || enrollments.length === 0) {
      return {
        success: true,
        data: {
          attendances: [],
          students: [],
        },
      }
    }

    // 5. 등록 학생의 student_id 목록으로 출석 기록 조회
    const studentIds = [...new Set(enrollments.map(e => e.student_id))]

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        students!student_id (
          id,
          student_code,
          users!inner (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('attendance_date', params.date)
      .in('student_id', studentIds)

    if (attendanceError) throw attendanceError

    return {
      success: true,
      data: {
        attendances: attendanceData || [],
        students: enrollments,
      },
    }
  } catch (error) {
    console.error('getAttendanceByDate error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 단일 출석 저장 (UI에서 개별 변경 시)
 */
export async function saveAttendance(params: {
  classId: string
  date: string
  studentId: string
  status: string
  checkInAt?: string
  reason?: string
  isSelfStudy?: boolean
  isMakeupClass?: boolean
  lateMinutes?: number
  earlyLeaveMinutes?: number
}) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 세션 찾거나 생성
    const sessionResult = await findOrCreateSession({
      class_id: params.classId,
      session_date: params.date,
    })

    if (!sessionResult.success || !sessionResult.data) {
      throw new Error(sessionResult.error || '세션 생성 실패')
    }

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = createServiceRoleClient()

    // 4. 출석 upsert
    const { data, error } = await supabase
      .from('attendance')
      .upsert({
        tenant_id: tenantId,
        session_id: sessionResult.data.id,
        student_id: params.studentId,
        status: params.status,
        check_in_at: params.checkInAt,
        reason: params.reason,
        is_self_study: params.isSelfStudy ?? false,
        is_makeup_class: params.isMakeupClass ?? false,
        late_minutes: params.lateMinutes,
        early_leave_minutes: params.earlyLeaveMinutes,
      }, {
        onConflict: 'session_id,student_id',
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/attendance')

    return { success: true, data }
  } catch (error) {
    console.error('saveAttendance error:', error)
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
 *
 * ✅ N+1 쿼리 제거: 학생별 개별 조회 → IN 연산자로 배치 조회
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
    const supabase = createServiceRoleClient()

    // 빈 배열 체크
    if (notifications.length === 0) {
      return { success: true, successCount: 0 }
    }

    // 3. 모든 학생의 보호자 정보를 한 번에 조회 (N+1 → 1 쿼리)
    const studentIds = notifications.map(n => n.student_id)
    const { data: allGuardians, error: guardianError } = await supabase
      .from('student_guardians')
      .select(`
        student_id,
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
      .in('student_id', studentIds)
      .eq('tenant_id', tenantId)

    if (guardianError) {
      console.error('Failed to fetch guardians:', guardianError)
      return { success: false, error: '보호자 정보 조회 실패', successCount: 0 }
    }

    // 4. 학생 ID별 보호자 Map 생성 (O(1) 조회)
    const guardiansByStudent = new Map<string, { user_id: string }>()
    for (const sg of allGuardians || []) {
      // 첫 번째 보호자만 사용 (기존 로직과 동일)
      if (!guardiansByStudent.has(sg.student_id)) {
        const guardian = sg.guardians as any
        if (guardian?.user_id) {
          guardiansByStudent.set(sg.student_id, { user_id: guardian.user_id })
        }
      }
    }

    // 5. 알림 데이터 배치 생성
    const notificationsToInsert = notifications
      .filter(n => guardiansByStudent.has(n.student_id))
      .map(n => ({
        tenant_id: tenantId,
        user_id: guardiansByStudent.get(n.student_id)!.user_id,
        type: 'attendance_alert',
        title: '결석 알림',
        message: `${n.student_name} 학생이 ${n.session_date} 수업에 결석했습니다.`,
        metadata: {
          student_id: n.student_id,
          session_id: n.session_id,
          session_date: n.session_date,
        },
      }))

    // 보호자가 없는 학생 로깅
    const studentsWithoutGuardian = notifications.filter(n => !guardiansByStudent.has(n.student_id))
    if (studentsWithoutGuardian.length > 0) {
      console.warn(`No guardians found for students: ${studentsWithoutGuardian.map(s => s.student_id).join(', ')}`)
    }

    // 6. 알림 배치 INSERT (N번 → 1번 쿼리)
    let successCount = 0
    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert)

      if (!insertError) {
        successCount = notificationsToInsert.length
      } else {
        console.error('Failed to insert notifications:', insertError)
      }
    }

    // 7. 캐시 무효화
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
