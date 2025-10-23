/**
 * GetTodosWithStudentUseCase
 * 학생 정보가 포함된 TODO 목록 조회 Use Case
 */

import type { ITodoRepository, TodoFilters, TodoWithStudent } from '@core/domain/repositories/ITodoRepository'

export interface GetTodosWithStudentInput {
  tenantId: string
  filters?: TodoFilters
  limit?: number
}

export interface GetTodosWithStudentOutput {
  todos: TodoWithStudent[]
  error: Error | null
}

export class GetTodosWithStudentUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: GetTodosWithStudentInput): Promise<GetTodosWithStudentOutput> {
    try {
      const todos = await this.todoRepository.findAllWithStudent(
        input.tenantId,
        input.filters,
        input.limit
      )

      return {
        todos,
        error: null,
      }
    } catch (error) {
      console.error('[GetTodosWithStudentUseCase] Error:', error)
      return {
        todos: [],
        error: error as Error,
      }
    }
  }
}
