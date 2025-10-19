/**
 * VerifyTodosUseCase
 * 여러 TODO 일괄 검증 처리 Use Case
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { ValidationError } from '@/lib/error-types'

export interface VerifyTodosInput {
  todoIds: string[]
  verifiedBy: string // User ID of the teacher/instructor
  tenantId: string
}

export interface VerifyTodosOutput {
  verifiedCount: number
  verifiedTodoIds: string[]
  failedTodoIds: { id: string; reason: string }[]
  error: Error | null
}

export class VerifyTodosUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: VerifyTodosInput): Promise<VerifyTodosOutput> {
    try {
      // 입력값 검증
      if (!input.todoIds || input.todoIds.length === 0) {
        throw new ValidationError('검증할 TODO를 최소 한 개 이상 선택해야 합니다')
      }

      if (!input.verifiedBy) {
        throw new ValidationError('검증자 정보는 필수입니다')
      }

      const verifiedTodos: Todo[] = []
      const failedTodoIds: { id: string; reason: string }[] = []

      // 각 TODO를 조회하고 검증
      for (const todoId of input.todoIds) {
        try {
          const todo = await this.todoRepository.findById(todoId)

          if (!todo) {
            failedTodoIds.push({ id: todoId, reason: 'TODO를 찾을 수 없습니다' })
            continue
          }

          // Tenant isolation 체크
          if (todo.tenantId !== input.tenantId) {
            failedTodoIds.push({ id: todoId, reason: '권한이 없습니다' })
            continue
          }

          // 완료 상태 확인
          if (!todo.isCompleted) {
            failedTodoIds.push({ id: todoId, reason: '완료되지 않은 TODO는 검증할 수 없습니다' })
            continue
          }

          // 이미 검증된 TODO 확인
          if (todo.isVerified) {
            failedTodoIds.push({ id: todoId, reason: '이미 검증된 TODO입니다' })
            continue
          }

          // 도메인 로직을 통한 검증
          const verifiedTodo = todo.verify(input.verifiedBy)
          verifiedTodos.push(verifiedTodo)
        } catch (error) {
          failedTodoIds.push({
            id: todoId,
            reason: error instanceof Error ? error.message : '알 수 없는 오류',
          })
        }
      }

      // Bulk 저장
      if (verifiedTodos.length > 0) {
        await this.todoRepository.saveBulk(verifiedTodos)
      }

      return {
        verifiedCount: verifiedTodos.length,
        verifiedTodoIds: verifiedTodos.map(t => t.id),
        failedTodoIds,
        error: null,
      }
    } catch (error) {
      console.error('[VerifyTodosUseCase] Error:', error)
      return {
        verifiedCount: 0,
        verifiedTodoIds: [],
        failedTodoIds: [],
        error: error as Error,
      }
    }
  }
}
