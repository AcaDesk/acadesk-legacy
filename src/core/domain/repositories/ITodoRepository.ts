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

/**
 * 학생 정보가 포함된 TODO (조인 조회용)
 */
export interface TodoWithStudent {
  todo: Todo
  student: {
    id: string
    studentCode: string
    name: string
  }
}

export interface ITodoRepository {
  /**
   * ID로 TODO 조회
   */
  findById(id: string, tenantId: string): Promise<Todo | null>

  /**
   * ID로 TODO 조회 (없으면 에러 발생)
   */
  findByIdOrThrow(id: string, tenantId: string): Promise<Todo>

  /**
   * 학생의 모든 TODO 조회
   */
  findByStudentId(studentId: string, tenantId: string, includeCompleted?: boolean): Promise<Todo[]>

  /**
   * 학생의 특정 날짜 TODO 조회 (키오스크용)
   * @param studentId 학생 ID
   * @param date 조회할 날짜 (YYYY-MM-DD 형식)
   */
  findByStudentIdForDate(studentId: string, tenantId: string, date: string): Promise<Todo[]>

  /**
   * 테넌트의 모든 TODO 조회 (필터 적용 가능)
   */
  findAll(tenantId: string, filters?: TodoFilters, limit?: number): Promise<Todo[]>

  /**
   * 테넌트의 모든 TODO 조회 with 학생 정보 (조인)
   * UI에서 학생 이름, 학번 등이 필요한 경우 사용
   */
  findAllWithStudent(tenantId: string, filters?: TodoFilters, limit?: number): Promise<TodoWithStudent[]>

  /**
   * 기한이 임박한 TODO 조회 (D-3 이내)
   */
  findUpcoming(studentId: string, tenantId: string, days?: number): Promise<Todo[]>

  /**
   * 연체된 TODO 조회
   */
  findOverdue(studentId: string, tenantId: string): Promise<Todo[]>

  /**
   * TODO 저장 (생성 or 업데이트)
   */
  save(todo: Todo, tenantId: string): Promise<Todo>

  /**
   * TODO 일괄 저장
   */
  saveBulk(todos: Todo[], tenantId: string): Promise<Todo[]>

  /**
   * TODO 삭제
   */
  delete(id: string, tenantId: string): Promise<void>

  /**
   * TODO 통계 조회
   */
  getStats(filters?: { studentId?: string; tenantId?: string }): Promise<TodoStats>

  /**
   * 학생의 완료율 조회 (백분율)
   */
  getCompletionRate(studentId: string, dateFrom?: Date, dateTo?: Date): Promise<number>
}
