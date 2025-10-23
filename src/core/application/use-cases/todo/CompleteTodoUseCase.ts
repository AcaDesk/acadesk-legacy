/**
 * Complete Todo Use Case
 * TODO 완료 처리 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@core/domain/repositories/ITodoRepository'
import { Todo } from '@core/domain/entities/Todo'
import { NotFoundError, ValidationError } from '@/lib/error-types'

export class CompleteTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  /**
   * TODO 완료 처리
   */
  async execute(todoId: string, tenantId: string): Promise<Todo> {
    // Find todo
    const todo = await this.todoRepository.findById(todoId, tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Check if already completed
    if (todo.isCompleted) {
      throw new ValidationError('이미 완료된 TODO입니다')
    }

    // Complete using domain logic
    const completedTodo = todo.complete()

    // Persist to database
    return await this.todoRepository.save(completedTodo, tenantId)
  }

  /**
   * TODO 완료 취소
   */
  async uncomplete(todoId: string, tenantId: string): Promise<Todo> {
    // Find todo
    const todo = await this.todoRepository.findById(todoId, tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Check if not completed
    if (!todo.isCompleted) {
      throw new ValidationError('완료되지 않은 TODO입니다')
    }

    // Check if verified
    if (todo.isVerified) {
      throw new ValidationError('검증된 TODO는 완료 취소할 수 없습니다')
    }

    // Uncomplete using domain logic
    const uncompletedTodo = todo.uncomplete()

    // Persist to database
    return await this.todoRepository.save(uncompletedTodo, tenantId)
  }
}
