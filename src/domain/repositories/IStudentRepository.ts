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
  commuteMethod?: string
  marketingSource?: string
  enrollmentDateFrom?: string // ISO date string (YYYY-MM-DD)
  enrollmentDateTo?: string // ISO date string (YYYY-MM-DD)
}

export interface StudentWithDetails {
  student: Student
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  classNames: string[] // 수강 중인 클래스 이름 목록
}

export interface IStudentRepository {
  /**
   * ID로 학생 조회
   * @param id 학생 ID
   * @param tenantId 테넌트 ID (보안: service_role에서 명시적 필터링 필수)
   * @param options 조회 옵션
   */
  findById(id: string, tenantId: string, options?: FindStudentOptions): Promise<Student | null>

  /**
   * ID로 학생 조회 (없으면 에러 발생)
   * @param id 학생 ID
   * @param tenantId 테넌트 ID (보안: service_role에서 명시적 필터링 필수)
   * @param options 조회 옵션
   */
  findByIdOrThrow(id: string, tenantId: string, options?: FindStudentOptions): Promise<Student>

  /**
   * 학생 코드로 조회
   */
  findByStudentCode(code: StudentCode, tenantId: string): Promise<Student | null>

  /**
   * 학생 코드로 조회 (키오스크 PIN 포함)
   * 키오스크 인증 시 사용 - kiosk_pin 필드 포함하여 반환
   */
  findByStudentCodeForKiosk(studentCode: string, tenantId: string): Promise<Student | null>

  /**
   * 테넌트의 모든 학생 조회
   */
  findAll(tenantId: string, filters?: StudentFilters, options?: FindStudentOptions): Promise<Student[]>

  /**
   * 테넌트의 모든 학생 조회 (users 및 class_enrollments 정보 포함)
   */
  findAllWithDetails(tenantId: string, filters?: StudentFilters, options?: FindStudentOptions): Promise<StudentWithDetails[]>

  /**
   * 학생 검색 (이름, 학생 코드)
   */
  search(query: string, tenantId: string, limit?: number): Promise<Student[]>

  /**
   * 학생 저장 (생성 or 업데이트)
   * @param student 학생 엔티티
   * @param tenantId 테넌트 ID (보안: student.tenantId와 일치해야 함)
   */
  save(student: Student, tenantId: string): Promise<Student>

  /**
   * 학생 삭제 (소프트 삭제)
   * @param id 학생 ID
   * @param tenantId 테넌트 ID (보안: service_role에서 명시적 필터링 필수)
   */
  delete(id: string, tenantId: string): Promise<void>

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
