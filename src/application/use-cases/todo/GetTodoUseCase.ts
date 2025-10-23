/**
 * Get Todo Use Case
 * TODO 조회 유스케이스 - Application Layer
 */

import type { ITodoRepository, TodoFilters, TodoStats } from '@/domain/repositories/ITodoRepository'
import type { Todo } from '@/domain/entities/Todo'
import { NotFoundError } from '@/lib/error-types'

export class GetTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  /**
   * ID로 TODO 조회
   */
  async getById(id: string, tenantId: string): Promise<Todo | null> {
    return await this.todoRepository.findById(id, tenantId)
  }

  /**
   * ID로 TODO 조회 (없으면 에러)
   */
  async getByIdOrThrow(id: string, tenantId: string): Promise<Todo> {
    const todo = await this.todoRepository.findById(id, tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    return todo
  }

  /**
   * 학생의 모든 TODO 조회
   */
  async getByStudentId(studentId: string, tenantId: string, includeCompleted: boolean = true): Promise<Todo[]> {
    return await this.todoRepository.findByStudentId(studentId, tenantId, includeCompleted)
  }

  /**
   * 테넌트의 모든 TODO 조회
   */
  async getAllByTenant(tenantId: string, filters?: TodoFilters, limit?: number): Promise<Todo[]> {
    return await this.todoRepository.findAll(tenantId, filters, limit)
  }

  /**
   * 임박한 TODO 조회 (D-3 이내)
   */
  async getUpcoming(studentId: string, tenantId: string, days: number = 3): Promise<Todo[]> {
    return await this.todoRepository.findUpcoming(studentId, tenantId, days)
  }

  /**
   * 연체된 TODO 조회
   */
  async getOverdue(studentId: string, tenantId: string): Promise<Todo[]> {
    return await this.todoRepository.findOverdue(studentId, tenantId)
  }

  /**
   * TODO 통계 조회
   */
  async getStats(filters?: { studentId?: string; tenantId?: string }): Promise<TodoStats> {
    return await this.todoRepository.getStats(filters)
  }

  /**
   * 완료율 조회
   */
  async getCompletionRate(studentId: string, dateFrom?: Date, dateTo?: Date): Promise<number> {
    return await this.todoRepository.getCompletionRate(studentId, dateFrom, dateTo)
  }
}
