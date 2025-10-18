/**
 * Delete Todo Use Case
 * TODO 삭제 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { NotFoundError } from '@/lib/error-types'

export class DeleteTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(todoId: string): Promise<void> {
    // Verify todo exists
    const todo = await this.todoRepository.findById(todoId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Delete using repository
    await this.todoRepository.delete(todoId)
  }
}
