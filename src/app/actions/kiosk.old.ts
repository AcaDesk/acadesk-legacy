'use server'

import { createServerClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export interface Student {
  id: string
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

export interface AuthResult {
  success: boolean
  student?: Student
  error?: string
}

export interface TodosResult {
  success: boolean
  todos?: StudentTodo[]
  error?: string
}

export interface ToggleResult {
  success: boolean
  error?: string
}

/**
 * 키오스크 PIN 인증
 * @param studentCode 학생 코드 (예: S2501001)
 * @param pin 4자리 PIN
 */
export async function authenticateKioskPin(
  studentCode: string,
  pin: string
): Promise<AuthResult> {
  try {
    const supabase = await createServerClient()

    // 학생 코드로 학생 조회
    const { data: student, error } = await supabase
      .from('students')
      .select('id, student_code, name, grade, profile_image_url, kiosk_pin')
      .eq('student_code', studentCode.toUpperCase())
      .is('deleted_at', null)
      .single()

    if (error || !student) {
      console.error('학생 조회 오류:', error)
      return {
        success: false,
        error: '학생을 찾을 수 없습니다.',
      }
    }

    if (!student.kiosk_pin) {
      return {
        success: false,
        error: 'PIN이 설정되지 않았습니다. 선생님께 문의하세요.',
      }
    }

    // PIN 검증
    // 해시된 PIN인 경우 bcrypt 비교, 평문인 경우 직접 비교 (하위 호환성)
    let isValid = false
    if (student.kiosk_pin.startsWith('$2')) {
      // bcrypt 해시 (시작이 $2a, $2b, $2y 등)
      isValid = await bcrypt.compare(pin, student.kiosk_pin)
    } else {
      // 평문 (레거시)
      isValid = pin === student.kiosk_pin
    }

    if (!isValid) {
      return {
        success: false,
        error: 'PIN이 일치하지 않습니다.',
      }
    }

    // kiosk_pin 필드 제거 후 반환
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { kiosk_pin: _, ...studentData } = student

    return {
      success: true,
      student: studentData as Student,
    }
  } catch (error) {
    console.error('PIN 인증 오류:', error)
    return {
      success: false,
      error: '인증 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 학생의 오늘 TODO 조회
 * @param studentId 학생 ID
 */
export async function getStudentTodosForToday(
  studentId: string
): Promise<TodosResult> {
  try {
    const supabase = await createServerClient()

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('student_todos')
      .select('id, title, subject, due_date, priority, completed_at, verified_at, notes, description, estimated_duration_minutes')
      .eq('student_id', studentId)
      .eq('due_date', today)
      .order('created_at')

    if (error) {
      console.error('TODO 조회 오류:', error)
      return {
        success: false,
        error: 'TODO를 불러오는 중 오류가 발생했습니다.',
      }
    }

    return {
      success: true,
      todos: data || [],
    }
  } catch (error) {
    console.error('TODO 조회 오류:', error)
    return {
      success: false,
      error: 'TODO를 불러오는 중 오류가 발생했습니다.',
    }
  }
}

/**
 * TODO 완료 토글
 * @param todoId TODO ID
 * @param studentId 학생 ID (권한 검증용)
 * @param currentStatus 현재 완료 상태
 */
export async function toggleTodoComplete(
  todoId: string,
  studentId: string,
  currentStatus: boolean
): Promise<ToggleResult> {
  try {
    const supabase = await createServerClient()

    // 학생 ID 검증 및 검증 상태 확인
    const { data: todo, error: fetchError } = await supabase
      .from('student_todos')
      .select('student_id, verified_at')
      .eq('id', todoId)
      .single()

    if (fetchError || !todo) {
      return {
        success: false,
        error: 'TODO를 찾을 수 없습니다.',
      }
    }

    if (todo.student_id !== studentId) {
      return {
        success: false,
        error: '권한이 없습니다.',
      }
    }

    // 검증된 TODO는 수정 불가
    if (todo.verified_at) {
      return {
        success: false,
        error: '이미 검증된 TODO는 수정할 수 없습니다.',
      }
    }

    // TODO 완료 상태 토글
    const { error: updateError } = await supabase
      .from('student_todos')
      .update({
        completed_at: currentStatus ? null : new Date().toISOString(),
      })
      .eq('id', todoId)

    if (updateError) {
      console.error('TODO 업데이트 오류:', updateError)
      return {
        success: false,
        error: 'TODO 상태를 변경하는 중 오류가 발생했습니다.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('TODO 토글 오류:', error)
    return {
      success: false,
      error: 'TODO 상태를 변경하는 중 오류가 발생했습니다.',
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
