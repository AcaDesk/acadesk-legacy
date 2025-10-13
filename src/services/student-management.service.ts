/**
 * Student Management Service
 *
 * 학생 생성/수정/삭제 등 관리 작업을 위한 비즈니스 로직
 * Client Component와 Server Component 모두에서 사용 가능
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError, ConflictError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { generateStudentCode } from '@/lib/constants'

// ==================== Types ====================

export interface CreateStudentInput {
  name: string
  email?: string
  phone?: string
  grade: string
  school?: string
  emergencyContact: string
  notes?: string
}

export interface UpdateStudentInput {
  name: string
  email?: string
  phone?: string
  grade: string
  school?: string
  emergencyContact: string
  notes?: string
}

export interface CreateStudentResult {
  userId: string
  studentId: string
  studentCode: string
}

// ==================== Service Functions ====================

/**
 * 학생 생성 (users + students 테이블 통합 처리)
 */
export async function createStudent(
  supabase: SupabaseClient,
  tenantId: string,
  input: CreateStudentInput
): Promise<CreateStudentResult> {
  try {
    // 1. users 테이블에 사용자 생성
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: input.email || null,
        name: input.name,
        phone: input.phone || null,
        role_code: 'student',
      })
      .select()
      .single()

    if (userError) {
      logError(userError, {
        service: 'StudentManagementService',
        method: 'createStudent',
        step: 'create_user'
      })
      throw new DatabaseError('사용자 레코드를 생성할 수 없습니다', userError)
    }

    if (!newUser) {
      throw new DatabaseError('사용자 레코드 생성 실패')
    }

    const userId = newUser.id

    // 2. students 테이블에 학생 정보 저장 (학생 코드 중복 방지 재시도)
    let studentCode = ''
    let studentId = ''
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      attempts++
      studentCode = generateStudentCode()

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          student_code: studentCode,
          grade: input.grade,
          school: input.school || null,
          emergency_contact: input.emergencyContact,
          notes: input.notes || null,
        })
        .select('id')
        .single()

      // 성공
      if (!studentError && student) {
        studentId = student.id
        break
      }

      // 학생 코드 중복 (23505 = unique constraint violation)
      if (studentError?.code === '23505') {
        logError(studentError, {
          service: 'StudentManagementService',
          method: 'createStudent',
          attempt: attempts,
          studentCode
        })

        // 마지막 시도였다면 에러
        if (attempts >= maxAttempts) {
          throw new ConflictError('학생 코드 생성에 실패했습니다. 다시 시도해주세요.')
        }

        // 다음 시도로 계속
        continue
      }

      // 다른 에러는 즉시 throw
      if (studentError) {
        logError(studentError, {
          service: 'StudentManagementService',
          method: 'createStudent',
          step: 'create_student'
        })
        throw new DatabaseError('학생 정보를 저장할 수 없습니다', studentError)
      }
    }

    if (!studentId) {
      throw new DatabaseError('학생 정보 저장 실패')
    }

    return {
      userId,
      studentId,
      studentCode,
    }
  } catch (error) {
    if (
      error instanceof DatabaseError ||
      error instanceof ConflictError
    ) {
      throw error
    }
    logError(error, { service: 'StudentManagementService', method: 'createStudent' })
    throw new DatabaseError('학생을 생성할 수 없습니다')
  }
}

/**
 * 학생 정보 업데이트 (users + students 테이블 통합 처리)
 */
export async function updateStudent(
  supabase: SupabaseClient,
  studentId: string,
  userId: string,
  input: UpdateStudentInput
): Promise<void> {
  try {
    // 1. users 테이블 업데이트
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
      })
      .eq('id', userId)

    if (userError) {
      logError(userError, {
        service: 'StudentManagementService',
        method: 'updateStudent',
        step: 'update_user',
        userId
      })
      throw new DatabaseError('사용자 정보를 업데이트할 수 없습니다', userError)
    }

    // 2. students 테이블 업데이트
    const { error: studentError } = await supabase
      .from('students')
      .update({
        grade: input.grade,
        school: input.school || null,
        emergency_contact: input.emergencyContact,
        notes: input.notes || null,
      })
      .eq('id', studentId)

    if (studentError) {
      logError(studentError, {
        service: 'StudentManagementService',
        method: 'updateStudent',
        step: 'update_student',
        studentId
      })
      throw new DatabaseError('학생 정보를 업데이트할 수 없습니다', studentError)
    }
  } catch (error) {
    if (error instanceof DatabaseError) throw error
    logError(error, { service: 'StudentManagementService', method: 'updateStudent' })
    throw new DatabaseError('학생 정보를 업데이트할 수 없습니다')
  }
}

