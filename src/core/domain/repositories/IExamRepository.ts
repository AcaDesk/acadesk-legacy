/**
 * Exam Repository Interface
 * 시험 리포지토리 인터페이스 - 도메인 레이어에 속함
 * 의존성 역전 원칙(DIP): 도메인이 인프라에 의존하지 않도록 인터페이스 정의
 */

import type { Exam } from '../entities/Exam'

export interface ExamFilters {
  classId?: string
  categoryCode?: string
  dateFrom?: Date
  dateTo?: Date
  isPast?: boolean
}

export interface IExamRepository {
  /**
   * ID로 시험 조회
   */
  findById(id: string): Promise<Exam | null>

  /**
   * ID로 시험 조회 (없으면 에러 발생)
   */
  findByIdOrThrow(id: string): Promise<Exam>

  /**
   * 테넌트의 모든 시험 조회
   */
  findAll(tenantId: string, filters?: ExamFilters): Promise<Exam[]>

  /**
   * 클래스별 시험 조회
   */
  findByClassId(classId: string): Promise<Exam[]>

  /**
   * 카테고리별 시험 조회
   */
  findByCategoryCode(tenantId: string, categoryCode: string): Promise<Exam[]>

  /**
   * 임박한 시험 조회 (특정 일수 이내)
   */
  findUpcoming(tenantId: string, days: number): Promise<Exam[]>

  /**
   * 지난 시험 조회
   */
  findPast(tenantId: string, limit?: number): Promise<Exam[]>

  /**
   * 시험 저장 (생성 or 업데이트)
   */
  save(exam: Exam): Promise<Exam>

  /**
   * 시험 삭제 (소프트 삭제)
   */
  delete(id: string): Promise<void>

  /**
   * 고유한 카테고리 목록 조회
   */
  findUniqueCategories(tenantId: string): Promise<string[]>
}
