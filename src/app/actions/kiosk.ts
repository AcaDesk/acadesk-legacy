/**
 * Kiosk Server Actions
 * 키오스크 관련 Server Actions
 */

'use server'

import bcrypt from 'bcryptjs'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { withServerAction } from '@/lib/server-action-helpers'
import { createKioskDeviceToken, verifyKioskDeviceToken } from '@/lib/kiosk-token'
import {
  KIOSK_RATE_LIMIT_ERROR,
  clearKioskAuthFailures,
  isKioskAuthRateLimited,
  recordKioskAuthFailure,
} from '@/lib/kiosk-rate-limit'

const INVALID_DEVICE_ERROR = '키오스크 인증이 유효하지 않습니다. 설정 페이지에서 기기를 다시 등록해주세요.'

/**
 * 키오스크 디바이스 등록 (스태프 인증 필수)
 *
 * 설정 페이지에서 호출 — 이 기기가 사용할 테넌트에 대한 서명 토큰을 발급한다.
 * 이후 모든 키오스크 액션은 이 토큰으로 테넌트를 유도하므로, 클라이언트가
 * 임의의 tenant_id를 보내 다른 학원 데이터에 접근할 수 없다.
 */
export async function provisionKioskDevice() {
  return withServerAction(
    async ({ tenantId }) => ({
      deviceToken: createKioskDeviceToken(tenantId),
      tenantId,
    }),
    { actionName: 'provisionKioskDevice' }
  )
}

// Legacy types for backward compatibility
export interface Student {
  id: string
  tenant_id: string
  student_code: string
  name: string
  grade: string | null
  profile_image_url: string | null
}

export interface StudentTodo {
  id: string
  title: string
  subject: string | null
  due_date: string | null
  priority: string
  completed_at: string | null
  verified_at: string | null
  notes: string | null
  description: string | null
  estimated_duration_minutes: number | null
}

/**
 * 키오스크 PIN 인증
 * @param studentCode 학생 코드 (예: S2501001)
 * @param pin 4자리 PIN
 * @param deviceToken 키오스크 디바이스 토큰
 */
export async function authenticateKioskPin(
  studentCode: string,
  pin: string,
  deviceToken: string
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    const tenantId = verifyKioskDeviceToken(deviceToken)
    if (!tenantId) {
      return { success: false, error: INVALID_DEVICE_ERROR }
    }

    const supabase = createServiceRoleClient()

    // 브루트포스 방어: 학생 코드 단위 시도 제한
    const rateLimitKey = `pin:${studentCode}`
    if (await isKioskAuthRateLimited(supabase, tenantId, rateLimitKey)) {
      return { success: false, error: KIOSK_RATE_LIMIT_ERROR }
    }

    // 학생 코드로 학생 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        tenant_id,
        student_code,
        name,
        grade,
        profile_image_url,
        kiosk_pin
      `)
      .eq('student_code', studentCode)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: '학생을 찾을 수 없습니다.',
      }
    }

    if (!student.kiosk_pin) {
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: 'PIN이 등록되지 않았습니다.',
      }
    }

    // PIN 검증
    const isValidPin = await bcrypt.compare(pin, student.kiosk_pin)

    if (!isValidPin) {
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: 'PIN이 올바르지 않습니다.',
      }
    }

    await clearKioskAuthFailures(supabase, tenantId, rateLimitKey)

    // Transform data to match Student interface
    const studentData: Student = {
      id: student.id,
      tenant_id: student.tenant_id,
      student_code: student.student_code,
      name: student.name,
      grade: student.grade,
      profile_image_url: student.profile_image_url,
    }

    return {
      success: true,
      student: studentData,
    }
  } catch (error) {
    console.error('키오스크 PIN 인증 오류:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 학생의 오늘 TODO 조회
 * @param studentId 학생 ID
 * @param deviceToken 키오스크 디바이스 토큰
 */
export async function getStudentTodosForToday(
  studentId: string,
  deviceToken: string
): Promise<{ success: boolean; todos?: StudentTodo[]; error?: string }> {
  try {
    const tenantId = verifyKioskDeviceToken(deviceToken)
    if (!tenantId) {
      return { success: false, error: INVALID_DEVICE_ERROR }
    }

    const supabase = createServiceRoleClient()

    // 오늘 날짜의 시작과 끝
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()

    today.setHours(23, 59, 59, 999)
    const todayEnd = today.toISOString()

    // 오늘 마감인 TODO 조회
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('id, title, subject, due_date, priority, completed_at, verified_at, notes, description, estimated_duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .gte('due_date', todayStart)
      .lte('due_date', todayEnd)
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })

    if (todosError) {
      throw todosError
    }

    return {
      success: true,
      todos: todos || [],
    }
  } catch (error) {
    console.error('TODO 조회 오류:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * TODO 완료 토글
 * @param todoId TODO ID
 * @param studentId 학생 ID (권한 검증용)
 * @param deviceToken 키오스크 디바이스 토큰
 * @param currentStatus 현재 완료 상태
 */
export async function toggleTodoComplete(
  todoId: string,
  studentId: string,
  deviceToken: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = verifyKioskDeviceToken(deviceToken)
    if (!tenantId) {
      return { success: false, error: INVALID_DEVICE_ERROR }
    }

    const supabase = createServiceRoleClient()

    // 권한 검증: 해당 TODO가 학생의 것인지 확인
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id, student_id, tenant_id')
      .eq('id', todoId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (todoError) {
      throw todoError
    }

    if (!todo) {
      return {
        success: false,
        error: 'TODO를 찾을 수 없거나 권한이 없습니다.',
      }
    }

    // 완료 상태 토글
    const completedAt = currentStatus ? null : new Date().toISOString()

    const { error: updateError } = await supabase
      .from('todos')
      .update({ completed_at: completedAt })
      .eq('id', todoId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      throw updateError
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('TODO 토글 오류:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * PIN 해싱 (관리자용 - 학생 등록/수정 시 사용)
 * @param pin 4자리 PIN
 */
export async function hashKioskPin(pin: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(pin, saltRounds)
}

/**
 * PIN 검증 (관리자용 - 테스트용)
 * @param pin 평문 PIN
 * @param hash 해시된 PIN
 */
export async function verifyKioskPin(pin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pin, hash)
}

/**
 * 학생 이름 검색 (키오스크용)
 *
 * 디바이스 토큰만으로 테넌트 전체 명부(미성년자 이름·사진)가 노출되지 않도록
 * 2글자 이상 검색어를 요구하고 결과를 최대 20건으로 제한한다.
 *
 * @param deviceToken 키오스크 디바이스 토큰
 * @param query 학생 이름 검색어 (2글자 이상)
 */
export async function searchKioskStudents(
  deviceToken: string,
  query: string
): Promise<{ success: boolean; students?: Student[]; error?: string }> {
  try {
    const tenantId = verifyKioskDeviceToken(deviceToken)
    if (!tenantId) {
      return { success: false, error: INVALID_DEVICE_ERROR }
    }

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      return { success: true, students: [] }
    }

    const supabase = createServiceRoleClient()

    // ilike 와일드카드 이스케이프 (검색어의 %, _, \를 리터럴로 처리)
    const escaped = trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`)

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        tenant_id,
        student_code,
        name,
        grade,
        profile_image_url
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .ilike('name', `%${escaped}%`)
      .order('name')
      .limit(20)

    if (studentsError) {
      throw studentsError
    }

    return {
      success: true,
      students: students || [],
    }
  } catch (error) {
    console.error('학생 검색 오류:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 이름 + 부모님 전화번호 뒷자리로 키오스크 인증
 * @param studentId 학생 ID
 * @param phoneLastFour 부모님 전화번호 뒷자리 4자리
 * @param deviceToken 키오스크 디바이스 토큰
 */
export async function authenticateKioskByNameAndPhone(
  studentId: string,
  phoneLastFour: string,
  deviceToken: string
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    const tenantId = verifyKioskDeviceToken(deviceToken)
    if (!tenantId) {
      return { success: false, error: INVALID_DEVICE_ERROR }
    }

    const supabase = createServiceRoleClient()

    // 브루트포스 방어: 학생 단위 시도 제한
    const rateLimitKey = `phone:${studentId}`
    if (await isKioskAuthRateLimited(supabase, tenantId, rateLimitKey)) {
      return { success: false, error: KIOSK_RATE_LIMIT_ERROR }
    }

    // 학생 정보와 Primary 보호자 전화번호 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        tenant_id,
        student_code,
        name,
        grade,
        profile_image_url,
        student_guardians!inner(
          is_primary,
          guardians!inner(
            users(phone)
          )
        )
      `)
      .eq('id', studentId)
      .eq('tenant_id', tenantId)
      .eq('student_guardians.is_primary', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: '학생을 찾을 수 없습니다.',
      }
    }

    // Primary 보호자 전화번호 가져오기
    const typedGuardians = student.student_guardians as unknown as Array<{ is_primary: boolean; guardians: { users: { phone: string } | null } | null }> | null
    const guardianPhone = typedGuardians?.[0]?.guardians?.users?.phone

    if (!guardianPhone) {
      // 보호자 전화번호 미등록 학생은 인증 수단이 없으므로 거부한다.
      // (과거의 기본 PIN 1234 폴백은 사실상 무인증 접근이라 제거 — 데스크에서
      //  보호자 연락처를 등록해야 키오스크 이용 가능)
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: '보호자 전화번호가 등록되지 않았습니다. 선생님께 문의해주세요.',
      }
    }

    // 전화번호 뒷자리 4자리 추출 (하이픈 제거 후)
    const cleanPhone = guardianPhone.replace(/-/g, '').replace(/\s/g, '')
    const correctLastFour = cleanPhone.slice(-4)

    // 입력값 검증
    if (phoneLastFour !== correctLastFour) {
      await recordKioskAuthFailure(supabase, tenantId, rateLimitKey)
      return {
        success: false,
        error: '전화번호 뒷자리가 일치하지 않습니다.',
      }
    }

    // 인증 성공
    await clearKioskAuthFailures(supabase, tenantId, rateLimitKey)
    const studentData: Student = {
      id: student.id,
      tenant_id: student.tenant_id,
      student_code: student.student_code,
      name: student.name,
      grade: student.grade,
      profile_image_url: student.profile_image_url,
    }

    return {
      success: true,
      student: studentData,
    }
  } catch (error) {
    console.error('키오스크 인증 오류:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
