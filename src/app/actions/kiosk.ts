/**
 * Kiosk Server Actions
 * Clean Architecture 패턴 적용 - Use Cases를 호출하는 Wrapper
 */

'use server'

import bcrypt from 'bcryptjs'
import {
  createAuthenticateWithPinUseCase,
  createGetStudentTodosForTodayUseCase,
  createToggleTodoCompleteForKioskUseCase,
} from '@/application/factories/kioskUseCaseFactory.server'

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
    const useCase = await createAuthenticateWithPinUseCase()
    const result = await useCase.execute(studentCode, pin)

    if (!result.success || !result.student) {
      return {
        success: false,
        error: result.error,
      }
    }

    // DTO를 Legacy 형식으로 변환
    const student: Student = {
      id: result.student.id,
      tenant_id: result.student.tenantId,
      student_code: result.student.studentCode,
      name: result.student.name,
      grade: result.student.grade,
      profile_image_url: result.student.profileImageUrl,
    }

    return {
      success: true,
      student,
    }
  } catch (error) {
    console.error('키오스크 PIN 인증 오류:', error)
    return {
      success: false,
      error: '인증 중 오류가 발생했습니다.',
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
    const useCase = await createGetStudentTodosForTodayUseCase()
    const result = await useCase.execute(studentId, tenantId)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      }
    }

    // DTO를 Legacy 형식으로 변환
    const todos: StudentTodo[] = (result.todos || []).map(todo => ({
      id: todo.id,
      title: todo.title,
      subject: todo.subject,
      due_date: todo.dueDate,
      priority: todo.priority,
      completed_at: todo.completedAt,
      verified_at: todo.verifiedAt,
      notes: todo.notes,
      description: todo.description,
      estimated_duration_minutes: todo.estimatedDurationMinutes,
    }))

    return {
      success: true,
      todos,
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
    const useCase = await createToggleTodoCompleteForKioskUseCase()
    const result = await useCase.execute(todoId, studentId, tenantId, currentStatus)

    return {
      success: result.success,
      error: result.error,
    }
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
