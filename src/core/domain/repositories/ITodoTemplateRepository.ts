/**
 * TodoTemplate Repository Interface
 * TODO 템플릿 리포지토리 인터페이스 - 도메인 레이어
 */

import type { TodoTemplate } from '../entities/TodoTemplate'

export interface ITodoTemplateRepository {
  /**
   * ID로 템플릿 조회
   */
  findById(id: string): Promise<TodoTemplate | null>

  /**
   * 테넌트의 모든 활성 템플릿 조회
   */
  findAllActive(tenantId: string): Promise<TodoTemplate[]>

  /**
   * 테넌트의 모든 템플릿 조회 (비활성 포함)
   */
  findAll(tenantId: string): Promise<TodoTemplate[]>

  /**
   * 과목별 템플릿 조회
   */
  findBySubject(tenantId: string, subject: string): Promise<TodoTemplate[]>

  /**
   * 템플릿 저장 (생성 or 업데이트)
   */
  save(template: TodoTemplate): Promise<TodoTemplate>

  /**
   * 템플릿 삭제 (소프트 삭제 - active = false)
   */
  delete(id: string): Promise<void>
}
