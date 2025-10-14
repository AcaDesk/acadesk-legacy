/**
 * TODO Management Service
 *
 * TODO 생성/수정/검증 등 관리 작업을 위한 비즈니스 로직
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError, ValidationError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { TodoRepository } from '@/services/data/todo.repository'

// ==================== Types ====================

export interface CreateTodoInput {
  title: string
  description?: string
  subject?: string
  due_date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  student_ids: string[]
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  subject?: string
  due_date?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface CreateTodoResult {
  todoCount: number
  todoIds: string[]
}

// ==================== Service Functions ====================

/**
 * TODO 일괄 생성 (여러 학생에게 동일한 TODO 배정)
 */
export async function createTodosForStudents(
  supabase: SupabaseClient,
  tenantId: string,
  input: CreateTodoInput
): Promise<CreateTodoResult> {
  try {
    // 입력값 검증
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('TODO 제목은 필수입니다')
    }

    if (!input.due_date) {
      throw new ValidationError('마감일은 필수입니다')
    }

    if (!input.student_ids || input.student_ids.length === 0) {
      throw new ValidationError('최소 한 명의 학생을 선택해야 합니다')
    }

    // Repository 생성
    const todoRepo = new TodoRepository(supabase)

    // 각 학생에게 TODO 생성
    const todos = input.student_ids.map(studentId => ({
      tenant_id: tenantId,
      student_id: studentId,
      title: input.title.trim(),
      description: input.description?.trim(),
      subject: input.subject?.trim(),
      due_date: input.due_date,
      priority: input.priority,
    }))

    const createdTodos = await todoRepo.createBulk(todos)

    return {
      todoCount: createdTodos.length,
      todoIds: createdTodos.map(t => t.id),
    }
  } catch (error) {
    if (
      error instanceof DatabaseError ||
      error instanceof ValidationError
    ) {
      throw error
    }
    logError(error, { service: 'TodoManagementService', method: 'createTodosForStudents' })
    throw new DatabaseError('TODO를 생성할 수 없습니다')
  }
}

/**
 * TODO 단일 생성
 */
export async function createTodo(
  supabase: SupabaseClient,
  tenantId: string,
  studentId: string,
  input: Omit<CreateTodoInput, 'student_ids'>
): Promise<string> {
  try {
    // 입력값 검증
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('TODO 제목은 필수입니다')
    }

    if (!input.due_date) {
      throw new ValidationError('마감일은 필수입니다')
    }

    // Repository 생성
    const todoRepo = new TodoRepository(supabase)

    const todo = await todoRepo.create({
      tenant_id: tenantId,
      student_id: studentId,
      title: input.title.trim(),
      description: input.description?.trim(),
      subject: input.subject?.trim(),
      due_date: input.due_date,
      priority: input.priority,
    })

    return todo.id
  } catch (error) {
    if (
      error instanceof DatabaseError ||
      error instanceof ValidationError
    ) {
      throw error
    }
    logError(error, { service: 'TodoManagementService', method: 'createTodo' })
    throw new DatabaseError('TODO를 생성할 수 없습니다')
  }
}

/**
 * TODO 업데이트
 */
export async function updateTodo(
  supabase: SupabaseClient,
  todoId: string,
  input: UpdateTodoInput
): Promise<void> {
  try {
    // 입력값 검증
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new ValidationError('TODO 제목은 필수입니다')
    }

    // Repository 생성
    const todoRepo = new TodoRepository(supabase)

    // 업데이트할 데이터 준비
    const updates: any = {}

    if (input.title !== undefined) {
      updates.title = input.title.trim()
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null
    }

    if (input.subject !== undefined) {
      updates.subject = input.subject?.trim() || null
    }

    if (input.due_date !== undefined) {
      updates.due_date = input.due_date
      updates.due_day_of_week = new Date(input.due_date).getDay()
    }

    if (input.priority !== undefined) {
      updates.priority = input.priority
    }

    await todoRepo.update(todoId, updates)
  } catch (error) {
    if (
      error instanceof DatabaseError ||
      error instanceof ValidationError
    ) {
      throw error
    }
    logError(error, { service: 'TodoManagementService', method: 'updateTodo' })
    throw new DatabaseError('TODO를 수정할 수 없습니다')
  }
}

/**
 * TODO 완료 처리
 */
export async function completeTodo(
  supabase: SupabaseClient,
  todoId: string
): Promise<void> {
  try {
    const todoRepo = new TodoRepository(supabase)
    await todoRepo.complete(todoId)
  } catch (error) {
    if (error instanceof DatabaseError) throw error
    logError(error, { service: 'TodoManagementService', method: 'completeTodo' })
    throw new DatabaseError('TODO를 완료 처리할 수 없습니다')
  }
}

/**
 * TODO 검증 처리
 */
export async function verifyTodo(
  supabase: SupabaseClient,
  todoId: string,
  verifiedBy: string
): Promise<void> {
  try {
    const todoRepo = new TodoRepository(supabase)
    await todoRepo.verify(todoId, verifiedBy)
  } catch (error) {
    if (error instanceof DatabaseError) throw error
    logError(error, { service: 'TodoManagementService', method: 'verifyTodo' })
    throw new DatabaseError('TODO를 검증 처리할 수 없습니다')
  }
}

/**
 * TODO 일괄 검증 처리
 */
export async function verifyTodos(
  supabase: SupabaseClient,
  todoIds: string[],
  verifiedBy: string
): Promise<number> {
  try {
    if (!todoIds || todoIds.length === 0) {
      throw new ValidationError('검증할 TODO를 선택해야 합니다')
    }

    const { error, count } = await supabase
      .from('student_todos')
      .update({
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .in('id', todoIds)

    if (error) {
      logError(error, { service: 'TodoManagementService', method: 'verifyTodos', todoIds })
      throw new DatabaseError('TODO를 검증 처리할 수 없습니다', error)
    }

    return count || 0
  } catch (error) {
    if (error instanceof DatabaseError || error instanceof ValidationError) throw error
    logError(error, { service: 'TodoManagementService', method: 'verifyTodos' })
    throw new DatabaseError('TODO를 검증 처리할 수 없습니다')
  }
}

/**
 * TODO 반려 처리 (완료 취소 + 피드백 + 알림 생성)
 */
export async function rejectTodo(
  supabase: SupabaseClient,
  todoId: string,
  feedback: string
): Promise<void> {
  try {
    if (!feedback || feedback.trim().length === 0) {
      throw new ValidationError('반려 사유를 입력해야 합니다')
    }

    const todoRepo = new TodoRepository(supabase)

    // 1. TODO 정보 조회 (학생 정보 포함)
    const { data: todo, error: todoError } = await supabase
      .from('student_todos')
      .select(`
        id,
        title,
        tenant_id,
        student_id,
        students (
          user_id,
          users (
            name
          )
        )
      `)
      .eq('id', todoId)
      .maybeSingle()

    if (todoError) {
      logError(todoError, { service: 'TodoManagementService', method: 'rejectTodo', todoId })
      throw new DatabaseError('TODO 정보를 조회할 수 없습니다', todoError)
    }

    if (!todo) {
      throw new DatabaseError('TODO를 찾을 수 없습니다')
    }

    // 2. 완료 상태 취소 및 피드백 추가
    await todoRepo.update(todoId, {
      completed_at: null,
      description: feedback.trim(), // 피드백을 description에 저장
    })

    // 3. 학생에게 인앱 알림 생성
    const studentUserId = todo.students?.user_id
    if (studentUserId) {
      const { error: notificationError } = await supabase
        .from('in_app_notifications')
        .insert({
          tenant_id: todo.tenant_id,
          user_id: studentUserId,
          type: 'todo_rejected',
          title: '과제가 반려되었습니다',
          message: `"${todo.title}" 과제가 반려되었습니다.\n피드백: ${feedback.trim()}`,
          reference_type: 'todo',
          reference_id: todoId,
          action_url: '/todos',
          is_read: false,
        })

      if (notificationError) {
        // 알림 생성 실패는 로그만 남기고 오류를 throw하지 않음 (주요 기능에 영향 X)
        logError(notificationError, {
          service: 'TodoManagementService',
          method: 'rejectTodo',
          context: 'notification creation failed',
          todoId,
          studentUserId,
        })
      }
    }
  } catch (error) {
    if (error instanceof DatabaseError || error instanceof ValidationError) throw error
    logError(error, { service: 'TodoManagementService', method: 'rejectTodo' })
    throw new DatabaseError('TODO를 반려 처리할 수 없습니다')
  }
}

/**
 * TODO 삭제
 */
export async function deleteTodo(
  supabase: SupabaseClient,
  todoId: string
): Promise<void> {
  try {
    const todoRepo = new TodoRepository(supabase)
    await todoRepo.delete(todoId)
  } catch (error) {
    if (error instanceof DatabaseError) throw error
    logError(error, { service: 'TodoManagementService', method: 'deleteTodo' })
    throw new DatabaseError('TODO를 삭제할 수 없습니다')
  }
}

/**
 * Tenant ID 조회 (첫 번째 학생으로부터)
 */
export async function getTenantIdFromStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('tenant_id')
      .eq('id', studentId)
      .maybeSingle()

    if (error) {
      logError(error, {
        service: 'TodoManagementService',
        method: 'getTenantIdFromStudent',
        studentId
      })
      throw new DatabaseError('학생 정보를 조회할 수 없습니다', error)
    }

    if (!data) {
      throw new DatabaseError('학생 정보를 찾을 수 없습니다')
    }

    return data.tenant_id
  } catch (error) {
    if (error instanceof DatabaseError) throw error
    logError(error, { service: 'TodoManagementService', method: 'getTenantIdFromStudent' })
    throw new DatabaseError('학생 정보를 조회할 수 없습니다')
  }
}
