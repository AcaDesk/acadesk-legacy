/**
 * Todo Repository Interface
 * TODO 리포지토리 인터페이스 - 도메인 레이어에 속함
 * 의존성 역전 원칙(DIP): 도메인이 인프라에 의존하지 않도록 인터페이스 정의
 */

import type { Todo } from '../entities/Todo'
import type { PriorityLevel } from '../value-objects/Priority'

export interface TodoFilters {
  studentId?: string
  status?: 'pending' | 'completed' | 'verified'
  priority?: PriorityLevel
  subject?: string
  dueDateFrom?: Date
  dueDateTo?: Date
}

export interface TodoStats {
  total: number
  pending: number
  completed: number
  verified: number
  overdue: number
}

export interface ITodoRepository {
  /**
   * ID로 TODO 조회
   */
  findById(id: string): Promise<Todo | null>

  /**
   * ID로 TODO 조회 (없으면 에러 발생)
   */
  findByIdOrThrow(id: string): Promise<Todo>

  /**
   * 학생의 모든 TODO 조회
   */
  findByStudentId(studentId: string, includeCompleted?: boolean): Promise<Todo[]>

  /**
   * 테넌트의 모든 TODO 조회 (필터 적용 가능)
   */
  findAll(tenantId: string, filters?: TodoFilters, limit?: number): Promise<Todo[]>

  /**
   * 기한이 임박한 TODO 조회 (D-3 이내)
   */
  findUpcoming(studentId: string, days?: number): Promise<Todo[]>

  /**
   * 연체된 TODO 조회
   */
  findOverdue(studentId: string): Promise<Todo[]>

  /**
   * TODO 저장 (생성 or 업데이트)
   */
  save(todo: Todo): Promise<Todo>

  /**
   * TODO 일괄 저장
   */
  saveBulk(todos: Todo[]): Promise<Todo[]>

  /**
   * TODO 삭제
   */
  delete(id: string): Promise<void>

  /**
   * TODO 통계 조회
   */
  getStats(filters?: { studentId?: string; tenantId?: string }): Promise<TodoStats>

  /**
   * 학생의 완료율 조회 (백분율)
   */
  getCompletionRate(studentId: string, dateFrom?: Date, dateTo?: Date): Promise<number>
}
