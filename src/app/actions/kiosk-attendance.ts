/**
 * Kiosk Attendance Server Actions
 * 출석 키오스크 전용 Server Actions (인증 없이 PIN 기반으로 동작)
 */

'use server'

import bcrypt from 'bcryptjs'
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
 * PIN으로 학생 조회 및 오늘 출석 상태 반환
 * - tenant 내 kiosk_pin 등록 학생 전체에 bcrypt 병렬 비교
 * - 오늘 날짜 기준 attendance 레코드로 현재 상태 결정
 */
export async function lookupStudentByPin(
  tenantId: string,
  pin: string
): Promise<{ success: boolean; student?: KioskStudentInfo; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    // 1. kiosk_pin이 등록된 학생 전체 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, grade, kiosk_pin')
      .eq('tenant_id', tenantId)
      .not('kiosk_pin', 'is', null)
      .is('deleted_at', null)

    if (studentsError) throw studentsError

    if (!students || students.length === 0) {
      return { success: false, error: 'PIN 등록된 학생이 없습니다.' }
    }

    // 2. bcrypt 병렬 비교
    const comparisons = await Promise.all(
      students.map(async (s) => ({
        student: s,
        match: await bcrypt.compare(pin, s.kiosk_pin as string),
      }))
    )

    const matched = comparisons.find((r) => r.match)
    if (!matched) {
      return { success: false, error: 'PIN이 올바르지 않습니다.' }
    }

    const student = matched.student

    // 3. 오늘 날짜의 attendance 레코드 조회
    const today = new Date().toISOString().split('T')[0]
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id, check_in_at, check_out_at')
      .eq('tenant_id', tenantId)
      .eq('student_id', student.id)
      .eq('attendance_date', today)
      .maybeSingle()

    // 4. 현재 상태 결정
    let currentStatus: KioskStudentStatus = 'out'
    if (attendance) {
      if (attendance.check_out_at) {
        currentStatus = 'done'
      } else if (attendance.check_in_at) {
        currentStatus = 'in'
      }
    }

    return {
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        currentStatus,
      },
    }
  } catch (error) {
    console.error('lookupStudentByPin error:', error)
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
  // 기존 세션 조회
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .eq('session_date', today)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  // 세션 생성
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
    // 동시 요청으로 이미 생성된 경우 재조회
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
 * - 학생의 class_enrollment로 class_id 조회
 * - 미배정 학생은 기본 클래스로 처리
 * - attendance 테이블 upsert: check_in_at 또는 check_out_at 업데이트
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

    if (!classId) {
      throw new Error('출석 저장용 클래스를 찾을 수 없습니다.')
    }

    // 3. 세션 조회 또는 생성
    const sessionId = await getOrCreateKioskSession(supabase, tenantId, classId, today)

    // 4. attendance upsert (지정한 필드만 업데이트)
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
