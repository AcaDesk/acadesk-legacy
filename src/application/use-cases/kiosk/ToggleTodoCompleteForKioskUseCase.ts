/**
 * Toggle Todo Complete For Kiosk Use Case
 * 키오스크용 TODO 완료 토글 유스케이스 - Application Layer
 *
 * 학생이 자신의 TODO를 완료/취소할 수 있습니다.
 * 검증된 TODO는 수정할 수 없습니다.
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { logTodoCompleted, logTodoUncompleted, logUnauthorizedAccess } from '@/lib/audit-logger'

export interface ToggleResult {
  success: boolean
  error?: string
}

export class ToggleTodoCompleteForKioskUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(
    todoId: string,
    studentId: string,
    currentStatus: boolean
  ): Promise<ToggleResult> {
    try {
      // TODO 조회
      const todo = await this.todoRepository.findById(todoId)

      if (!todo) {
        return {
          success: false,
          error: 'TODO를 찾을 수 없습니다.',
        }
      }

      // 학생 ID 검증 (본인의 TODO만 수정 가능)
      if (todo.studentId !== studentId) {
        logUnauthorizedAccess({
          studentId,
          resourceType: 'todo',
          resourceId: todoId,
          reason: '다른 학생의 TODO 접근 시도',
        })
        return {
          success: false,
          error: '권한이 없습니다.',
        }
      }

      // 검증된 TODO는 수정 불가
      if (todo.isVerified) {
        return {
          success: false,
          error: '이미 검증된 TODO는 수정할 수 없습니다.',
        }
      }

      // 완료 상태 토글
      let updatedTodo
      if (currentStatus) {
        // 완료 → 미완료
        updatedTodo = todo.uncomplete()
        logTodoUncompleted({
          todoId,
          studentId,
          tenantId: todo.tenantId,
        })
      } else {
        // 미완료 → 완료
        updatedTodo = todo.complete()
        logTodoCompleted({
          todoId,
          studentId,
          tenantId: todo.tenantId,
        })
      }

      // 저장
      await this.todoRepository.save(updatedTodo)

      return {
        success: true,
      }
    } catch (error) {
      logError(error, {
        useCase: 'ToggleTodoCompleteForKioskUseCase',
        method: 'execute',
        todoId,
        studentId,
      })

      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: 'TODO를 찾을 수 없습니다.',
        }
      }

      if (error instanceof AuthorizationError) {
        return {
          success: false,
          error: error.message,
        }
      }

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: false,
        error: 'TODO 상태를 변경하는 중 오류가 발생했습니다.',
      }
    }
  }
}
