/**
 * Delete Todo Use Case
 * TODO 삭제 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@core/domain/repositories/ITodoRepository'
import { NotFoundError } from '@/lib/error-types'

export class DeleteTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(todoId: string, tenantId: string): Promise<void> {
    // Verify todo exists
    const todo = await this.todoRepository.findById(todoId, tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Delete using repository
    await this.todoRepository.delete(todoId, tenantId)
  }
}
