/**
 * Student Repository Interface
 * 학생 리포지토리 인터페이스 - 도메인 레이어에 속함
 * 의존성 역전 원칙(DIP): 도메인이 인프라에 의존하지 않도록 인터페이스 정의
 */

import type { Student } from '../entities/Student'
import type { StudentCode } from '../value-objects/StudentCode'

export interface FindStudentOptions {
  includeDeleted?: boolean
  includeWithdrawn?: boolean
}

export interface StudentFilters {
  grade?: string
  school?: string
  search?: string // 이름 또는 학생 코드 검색
}

export interface IStudentRepository {
  /**
   * ID로 학생 조회
   */
  findById(id: string, options?: FindStudentOptions): Promise<Student | null>

  /**
   * ID로 학생 조회 (없으면 에러 발생)
   */
  findByIdOrThrow(id: string, options?: FindStudentOptions): Promise<Student>

  /**
   * 학생 코드로 조회
   */
  findByStudentCode(code: StudentCode, tenantId: string): Promise<Student | null>

  /**
   * 테넌트의 모든 학생 조회
   */
  findAll(tenantId: string, filters?: StudentFilters, options?: FindStudentOptions): Promise<Student[]>

  /**
   * 학생 검색 (이름, 학생 코드)
   */
  search(query: string, tenantId: string, limit?: number): Promise<Student[]>

  /**
   * 학생 저장 (생성 or 업데이트)
   */
  save(student: Student): Promise<Student>

  /**
   * 학생 삭제 (소프트 삭제)
   */
  delete(id: string): Promise<void>

  /**
   * 학년별 학생 수 조회
   */
  countByGrade(tenantId: string): Promise<Record<string, number>>

  /**
   * 학교별 학생 수 조회
   */
  countBySchool(tenantId: string): Promise<Record<string, number>>

  /**
   * 고유한 학년 목록 조회
   */
  findUniqueGrades(tenantId: string): Promise<string[]>

  /**
   * 고유한 학교 목록 조회
   */
  findUniqueSchools(tenantId: string): Promise<string[]>
}
