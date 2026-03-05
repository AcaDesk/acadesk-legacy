/**
 * Kiosk Attendance Server Actions
 * 출석 키오스크 전용 Server Actions (보호자 전화번호 뒷자리 기반 인증)
 */

'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

export type KioskStudentStatus = 'out' | 'in' | 'done'

export interface KioskStudentInfo {
  id: string
  name: string
  grade: string | null
  currentStatus: KioskStudentStatus
}

/**
 * 보호자 전화번호 뒷 4자리로 학생 조회
 * - 1명 매칭: 바로 출석 확인 화면으로
 * - 여러 명 매칭(형제자매): 이름 선택 화면으로
 * - 0명: 에러
 */
export async function lookupStudentsByPhone(
  tenantId: string,
  phoneLast4: string
): Promise<{ success: boolean; students?: KioskStudentInfo[]; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    // 1. tenant 내 모든 학생 + primary 보호자 전화번호 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id, name, grade,
        student_guardians(
          guardians(
            users(phone)
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      return { success: false, error: '등록된 학생이 없습니다.' }
    }

    // 2. 전화번호 뒷 4자리 매칭 (숫자만 비교)
    const matched = students.filter((s) => {
      const guardians = s.student_guardians as unknown as Array<{
        guardians: { users: { phone: string } | null } | null
      }> | null

      const phones = (guardians ?? [])
        .filter((g) => g.guardians?.users?.phone)
        .map((g) => g.guardians!.users!.phone.replace(/\D/g, ''))

      return phones.some((p) => p.endsWith(phoneLast4))
    })

    if (matched.length === 0) {
      return { success: false, error: '일치하는 학생이 없습니다.\n보호자 전화번호를 확인해주세요.' }
    }

    // 3. 오늘 출석 상태 조회
    const today = new Date().toISOString().split('T')[0]
    const matchedIds = matched.map((s) => s.id)

    const { data: attendances } = await supabase
      .from('attendance')
      .select('student_id, check_in_at, check_out_at')
      .eq('tenant_id', tenantId)
      .in('student_id', matchedIds)
      .eq('attendance_date', today)

    const attendanceMap = new Map(
      (attendances ?? []).map((a) => [a.student_id, a])
    )

    // 4. 현재 상태 결정
    const result: KioskStudentInfo[] = matched.map((s) => {
      const a = attendanceMap.get(s.id)
      let currentStatus: KioskStudentStatus = 'out'
      if (a?.check_out_at) currentStatus = 'done'
      else if (a?.check_in_at) currentStatus = 'in'

      return { id: s.id, name: s.name, grade: s.grade, currentStatus }
    })

    return { success: true, students: result }
  } catch (error) {
    console.error('lookupStudentsByPhone error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 세션 조회 또는 생성 (service role 전용 내부 헬퍼)
 */
async function getOrCreateKioskSession(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  classId: string,
  today: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .eq('session_date', today)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const sessionDate = new Date(today)
  const startTime = new Date(sessionDate)
  startTime.setHours(9, 0, 0, 0)
  const endTime = new Date(sessionDate)
  endTime.setHours(18, 0, 0, 0)

  const { data: newSession, error: insertError } = await supabase
    .from('attendance_sessions')
    .insert({
      tenant_id: tenantId,
      class_id: classId,
      session_date: today,
      scheduled_start_at: startTime.toISOString(),
      scheduled_end_at: endTime.toISOString(),
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('class_id', classId)
        .eq('session_date', today)
        .limit(1)
        .single()

      if (retryError) throw retryError
      return retry.id
    }
    throw insertError
  }

  return newSession.id
}

/**
 * 키오스크 출석 기록 (등원/하원)
 */
export async function recordKioskAttendance(
  studentId: string,
  tenantId: string,
  action: 'check_in' | 'check_out'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 1. 학생의 class_id 조회
    const { data: enrollment } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    let classId: string | null = enrollment?.class_id ?? null

    // 2. 미배정 학생: 기본 클래스 조회 또는 생성
    if (!classId) {
      const { data: defaultClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('tenant_id', tenantId)
        .contains('meta', { attendance_default: true })
        .is('deleted_at', null)
        .limit(1)

      if (defaultClasses && defaultClasses.length > 0) {
        classId = defaultClasses[0].id
      } else {
        const { data: newClass, error: classError } = await supabase
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

        if (classError) throw classError
        classId = newClass.id
      }
    }

    if (!classId) throw new Error('출석 저장용 클래스를 찾을 수 없습니다.')

    // 3. 세션 조회 또는 생성
    const sessionId = await getOrCreateKioskSession(supabase, tenantId, classId, today)

    // 4. attendance upsert
    const baseFields = {
      tenant_id: tenantId,
      session_id: sessionId,
      student_id: studentId,
      status: 'present',
      is_self_study: false,
      is_makeup_class: false,
    }

    const upsertData =
      action === 'check_in'
        ? { ...baseFields, check_in_at: now }
        : { ...baseFields, check_out_at: now }

    const { error: upsertError } = await supabase
      .from('attendance')
      .upsert(upsertData, { onConflict: 'session_id,student_id' })

    if (upsertError) throw upsertError

    return { success: true }
  } catch (error) {
    console.error('recordKioskAttendance error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
