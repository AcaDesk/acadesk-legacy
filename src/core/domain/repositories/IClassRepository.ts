/**
 * Class Repository Interface
 * 수업 관련 데이터 접근 인터페이스
 */

import { Class } from '@core/domain/entities/Class'

export interface ClassWithDetails {
  class: Class
  instructorName: string | null
  studentCount: number
}

export interface IClassRepository {
  /**
   * ID로 수업 조회
   */
  findById(id: string): Promise<Class | null>

  /**
   * 테넌트의 모든 수업 조회 (instructor 정보 및 수강생 수 포함)
   */
  findAllWithDetails(): Promise<ClassWithDetails[]>

  /**
   * 수업 생성
   */
  create(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<Class>

  /**
   * 수업 업데이트
   */
  update(id: string, classData: Partial<Class>): Promise<Class>

  /**
   * 수업 삭제 (soft delete)
   */
  delete(id: string): Promise<void>
}
