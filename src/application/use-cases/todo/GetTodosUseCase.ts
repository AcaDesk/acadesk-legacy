/**
 * GetTodosUseCase
 * 여러 TODO 조회 Use Case (필터 적용 가능)
 */

import type { ITodoRepository, TodoFilters } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'

export interface GetTodosInput {
  tenantId: string
  filters?: TodoFilters
  limit?: number
}

export interface GetTodosOutput {
  todos: Todo[]
  error: Error | null
}

export class GetTodosUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: GetTodosInput): Promise<GetTodosOutput> {
    try {
      const todos = await this.todoRepository.findAll(
        input.tenantId,
        input.filters,
        input.limit
      )

      return {
        todos,
        error: null,
      }
    } catch (error) {
      console.error('[GetTodosUseCase] Error:', error)
      return {
        todos: [],
        error: error as Error,
      }
    }
  }
}
