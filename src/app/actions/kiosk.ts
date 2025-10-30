/**
 * Kiosk Server Actions
 * 키오스크 관련 Server Actions
 */

'use server'

import bcrypt from 'bcryptjs'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

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
 */
export async function authenticateKioskPin(
  studentCode: string,
  pin: string
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    // 학생 코드로 학생 조회 (users 테이블과 조인)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        tenant_id,
        student_code,
        grade,
        profile_image_url,
        kiosk_pin,
        users!inner (
          name
        )
      `)
      .eq('student_code', studentCode)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다.',
      }
    }

    if (!student.kiosk_pin) {
      return {
        success: false,
        error: 'PIN이 등록되지 않았습니다.',
      }
    }

    // PIN 검증
    const isValidPin = await bcrypt.compare(pin, student.kiosk_pin)

    if (!isValidPin) {
      return {
        success: false,
        error: 'PIN이 올바르지 않습니다.',
      }
    }

    // Transform data to match Student interface
    const studentData: Student = {
      id: student.id,
      tenant_id: student.tenant_id,
      student_code: student.student_code,
      name: (student.users as any)?.name || '',
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
 * @param tenantId 테넌트 ID
 */
export async function getStudentTodosForToday(
  studentId: string,
  tenantId: string
): Promise<{ success: boolean; todos?: StudentTodo[]; error?: string }> {
  try {
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
 * @param tenantId 테넌트 ID
 * @param currentStatus 현재 완료 상태
 */
export async function toggleTodoComplete(
  todoId: string,
  studentId: string,
  tenantId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
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
