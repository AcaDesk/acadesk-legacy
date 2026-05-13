/**
 * Attendance Management Server Actions
 *
 * 모든 출석 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { createNotification } from '@/lib/notification-helpers'

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
    const { data: existingSessions, error: selectError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('class_id', validatedData.class_id)
      .eq('session_date', validatedData.session_date)
      .order('created_at', { ascending: false })
      .limit(1)

    if (selectError) throw selectError

    // 5. 세션이 이미 존재하면 반환
    if (existingSessions && existingSessions.length > 0) {
      return { success: true, data: existingSessions[0] }
    }

    // 6. 세션이 없으면 생성 — 수업 스케줄 시간 우선, 없으면 기본값(09:00~18:00)
    const { data: classRow } = await supabase
      .from('classes')
      .select('schedule')
      .eq('id', validatedData.class_id)
      .single()

    const classSchedule = classRow?.schedule as { startTime?: string; endTime?: string } | null

    const sessionDate = new Date(validatedData.session_date)

    function applyHHmm(base: Date, hhmm: string): Date {
      const [h, m] = hhmm.split(':').map(Number)
      const d = new Date(base)
      d.setHours(h, m, 0, 0)
      return d
    }

    const scheduledStart = classSchedule?.startTime
      ? applyHHmm(sessionDate, classSchedule.startTime)
      : (() => { const d = new Date(sessionDate); d.setHours(9, 0, 0, 0); return d })()

    const scheduledEnd = classSchedule?.endTime
      ? applyHHmm(sessionDate, classSchedule.endTime)
      : (() => { const d = new Date(sessionDate); d.setHours(18, 0, 0, 0); return d })()

    const { data: newSession, error: insertError } = await supabase
      .from('attendance_sessions')
      .insert({
        tenant_id: tenantId,
        class_id: validatedData.class_id,
        session_date: validatedData.session_date,
        scheduled_start_at: scheduledStart.toISOString(),
        scheduled_end_at: scheduledEnd.toISOString(),
        status: 'in_progress',
      })
      .select()
      .single()

    // 7. 유니크 제약 위반(23505) = 동시 요청으로 이미 생성됨 → 재조회
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: retrySession, error: retryError } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('class_id', validatedData.class_id)
          .eq('session_date', validatedData.session_date)
          .limit(1)
          .single()

        if (retryError) throw retryError
        return { success: true, data: retrySession }
      }
      throw insertError
    }

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
 * 로스터(학생 목록) 전용 조회
 *
 * 전체 등록 학생 + 미배정 학생을 조회합니다.
 * unstable_cache로 서버 캐시 적용 (10분).
 * 클래스 필터 없이 전체를 반환하며, 클라이언트에서 필터링합니다.
 *
 * @returns 전체 학생 로스터
 */
export async function getAttendanceRoster() {
  try {
    const { tenantId } = await verifyStaff()

    return unstable_cache(
      async () => {
        const supabase = createServiceRoleClient()

        // 등록 학생 조회 (전체)
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('class_enrollments')
          .select(`
            class_id,
            student_id,
            students!inner (
              id,
              student_code,
              grade,
              school,
              users (
                name
              )
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .is('students.deleted_at', null)

        if (enrollmentError) throw enrollmentError

        let normalizedEnrollments = enrollments || []

        // 미배정 학생 병합
        const enrolledStudentIds = new Set(normalizedEnrollments.map((e: { student_id: string }) => e.student_id))

        const { data: allStudents, error: allStudentsError } = await supabase
          .from('students')
          .select(`
            id,
            student_code,
            grade,
            school,
            users (
              name
            )
          `)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)

        if (allStudentsError) throw allStudentsError

        const unassignedStudents = (allStudents || [])
          .filter((s: { id: string }) => !enrolledStudentIds.has(s.id))
          .map((s: Record<string, unknown> & { id: string }) => ({
            class_id: null,
            student_id: s.id,
            students: s,
          }))

        normalizedEnrollments = [...normalizedEnrollments, ...(unassignedStudents as unknown as typeof normalizedEnrollments)]

        return { success: true as const, data: { students: normalizedEnrollments } }
      },
      ['attendance-roster', tenantId],
      { revalidate: 600, tags: [`attendance-roster:${tenantId}`] }
    )()
  } catch (error) {
    console.error('getAttendanceRoster error:', error)
    return {
      success: false as const,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 출석 기록 전용 조회 (날짜 + studentIds 기준)
 *
 * attendance 테이블만 조회합니다. 캐시 없음 (실시간 반영 필요).
 *
 * @param params.date - 날짜 (YYYY-MM-DD)
 * @param params.studentIds - 조회할 학생 ID 배열
 * @returns 출석 기록 배열
 */
export async function getAttendanceRecordsByDate(params: {
  date: string
  studentIds: string[]
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    if (params.studentIds.length === 0) {
      return { success: true as const, data: { attendances: [] } }
    }

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        session_id,
        student_id,
        status,
        check_in_at,
        check_out_at,
        source,
        is_self_study,
        is_makeup_class,
        attendance_sessions!session_id (
          class_id
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('attendance_date', params.date)
      .in('student_id', params.studentIds)

    if (error) throw error

    return { success: true as const, data: { attendances: data || [] } }
  } catch (error) {
    console.error('getAttendanceRecordsByDate error:', error)
    return {
      success: false as const,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 날짜 + 클래스 기준으로 출석 데이터 조회 (UI용) - 하위 호환
 *
 * 내부적으로 getAttendanceRoster + getAttendanceRecordsByDate를 호출합니다.
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
    const rosterResult = await getAttendanceRoster()
    if (!rosterResult.success || !rosterResult.data) {
      return {
        success: false,
        data: null,
        error: rosterResult.error || '로스터 조회 실패',
      }
    }

    let enrollments = rosterResult.data.students
    if (params.classId) {
      enrollments = enrollments.filter((e: { class_id: string | null }) => e.class_id === params.classId)
    }

    if (enrollments.length === 0) {
      return {
        success: true,
        data: {
          attendances: [],
          students: [],
        },
      }
    }

    const studentIds = [...new Set(enrollments.map((e: { student_id: string }) => e.student_id))]

    const recordsResult = await getAttendanceRecordsByDate({
      date: params.date,
      studentIds,
    })

    if (!recordsResult.success || !recordsResult.data) {
      return {
        success: false,
        data: null,
        error: recordsResult.error || '출석 기록 조회 실패',
      }
    }

    return {
      success: true,
      data: {
        attendances: recordsResult.data.attendances,
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
  classId?: string | null
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
    const { tenantId, userId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = createServiceRoleClient()

    // 3. 클래스 ID 결정 (미배정 학생은 테넌트 기본 출석 클래스로 저장)
    let effectiveClassId = params.classId || null
    if (!effectiveClassId) {
      const { data: defaultClasses, error: defaultClassSelectError } = await supabase
        .from('classes')
        .select('id')
        .eq('tenant_id', tenantId)
        .contains('meta', { attendance_default: true })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (defaultClassSelectError) throw defaultClassSelectError

      if (defaultClasses && defaultClasses.length > 0) {
        effectiveClassId = defaultClasses[0].id
      } else {
        const { data: createdClass, error: defaultClassInsertError } = await supabase
          .from('classes')
          .insert({
            tenant_id: tenantId,
            name: '미배정 출석',
            description: '클래스 미배정 학생 출석 저장용 기본 클래스',
            status: 'active',
            active: true,
            meta: { attendance_default: true },
          })
          .select('id')
          .single()

        if (defaultClassInsertError) throw defaultClassInsertError
        effectiveClassId = createdClass.id
      }
    }

    if (!effectiveClassId) {
      throw new Error('출석 저장용 클래스를 찾을 수 없습니다.')
    }

    // 4. 세션 찾거나 생성
    const sessionResult = await findOrCreateSession({
      class_id: effectiveClassId,
      session_date: params.date,
    })

    if (!sessionResult.success || !sessionResult.data) {
      throw new Error(sessionResult.error || '세션 생성 실패')
    }

    // 5. 출석 upsert
    const { data, error } = await supabase
      .from('attendance')
      .upsert({
        tenant_id: tenantId,
        session_id: sessionResult.data.id,
        student_id: params.studentId,
        status: params.status,
        check_in_at: params.checkInAt,
        source: 'manual',
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

    // 보호자에게 출석/결석 알림톡 발송 (fire-and-forget)
    if (params.status === 'present' || params.status === 'absent') {
      const eventType = params.status === 'present' ? 'attendance_confirmed' : 'absence_detected'
      void import('@/lib/messaging/event-alimtalk').then(({ fireEventAlimtalk }) =>
        fireEventAlimtalk(tenantId, eventType, params.studentId, { 날짜: params.date })
      )
    }

    // 결석·지각 시 다른 스태프에게 알림 발송 (fire-and-forget)
    if (params.status === 'absent' || params.status === 'late') {
      // 학생 이름 조회 (알림 메시지용)
      const { data: studentRow } = await supabase
        .from('students')
        .select('users!inner(name)')
        .eq('id', params.studentId)
        .eq('tenant_id', tenantId)
        .single()

      const studentUsersData = studentRow?.users as unknown as { name: string } | null
      const studentName = studentUsersData?.name || '학생'
      const statusLabel = params.status === 'absent' ? '결석' : '지각'

      void createNotification({
        supabase,
        tenantId,
        actorUserId: userId,
        type: 'attendance_alert',
        title: `${statusLabel} 알림`,
        message: `${studentName} 학생이 ${params.date} 출석에서 ${statusLabel} 처리되었습니다.`,
        referenceType: 'attendance',
        referenceId: data?.id ?? null,
        actionUrl: '/attendance',
      })
    }

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
 * 출석 기록 취소 (DELETE)
 * 토글 방식으로 같은 상태를 다시 누르면 출석 기록 자체를 삭제
 */
export async function cancelAttendance(params: {
  date: string
  studentId: string
  classId?: string | null
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 해당 날짜 + 학생의 출석 레코드 삭제
    // attendance_sessions를 조인해서 날짜+클래스 기준으로 찾음
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('student_id', params.studentId)
      .in(
        'session_id',
        // 해당 날짜의 세션 ID들을 서브쿼리로 조회
        (await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('session_date', params.date)
          .then(({ data }) => data?.map((s) => s.id) || []))
      )

    if (error) throw error

    revalidatePath('/attendance')
    return { success: true }
  } catch (error) {
    console.error('cancelAttendance error:', error)
    return { success: false, error: getErrorMessage(error) }
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
        const guardian = sg.guardians as { user_id?: string } | null
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
