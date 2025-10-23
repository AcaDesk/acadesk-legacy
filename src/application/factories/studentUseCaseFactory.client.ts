/**
 * Student Use Case Factory (Client-side)
 * 학생 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createClientDataSource } from '@/lib/data-source-provider'
import { StudentRepository } from '@/infrastructure/database/student.repository'
import { CreateStudentUseCase } from '../use-cases/student/CreateStudentUseCase'
import { UpdateStudentUseCase } from '../use-cases/student/UpdateStudentUseCase'
import { DeleteStudentUseCase } from '../use-cases/student/DeleteStudentUseCase'
import { GetStudentUseCase } from '../use-cases/student/GetStudentUseCase'
import { GetStudentsUseCase } from '../use-cases/student/GetStudentsUseCase'
import { GetStudentsWithDetailsUseCase } from '../use-cases/student/GetStudentsWithDetailsUseCase'
import { GetUniqueGradesUseCase } from '../use-cases/student/GetUniqueGradesUseCase'
import { GetUniqueSchoolsUseCase } from '../use-cases/student/GetUniqueSchoolsUseCase'
import { WithdrawStudentUseCase } from '../use-cases/student/WithdrawStudentUseCase'
import { BulkEnrollClassUseCase } from '../use-cases/student/BulkEnrollClassUseCase'
import { UpdateStudentClassEnrollmentsUseCase } from '../use-cases/student/UpdateStudentClassEnrollmentsUseCase'
import { CreateStudentCompleteUseCase } from '../use-cases/student/CreateStudentCompleteUseCase'
import { GetStudentActivityLogsUseCase } from '../use-cases/student/GetStudentActivityLogsUseCase'
import { UpdateStudentProfileImageUseCase } from '../use-cases/student/UpdateStudentProfileImageUseCase'

/**
 * 학생 리포지토리 생성 (클라이언트 사이드)
 * @param config - DataSource 설정 (테스트 시 Mock 주입 가능)
 */
function createStudentRepository(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new StudentRepository(dataSource)
}

/**
 * CreateStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createCreateStudentUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new CreateStudentUseCase(repository)
}

/**
 * UpdateStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createUpdateStudentUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new UpdateStudentUseCase(repository)
}

/**
 * DeleteStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createDeleteStudentUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new DeleteStudentUseCase(repository)
}

/**
 * GetStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetStudentUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new GetStudentUseCase(repository)
}

/**
 * WithdrawStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createWithdrawStudentUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new WithdrawStudentUseCase(repository)
}

/**
 * GetStudents 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetStudentsUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new GetStudentsUseCase(repository)
}

/**
 * GetUniqueGrades 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetUniqueGradesUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new GetUniqueGradesUseCase(repository)
}

/**
 * GetUniqueSchools 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetUniqueSchoolsUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new GetUniqueSchoolsUseCase(repository)
}

/**
 * GetStudentsWithDetails 유스케이스 생성 (users 및 class_enrollments 정보 포함)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetStudentsWithDetailsUseCase(config?: DataSourceConfig) {
  const repository = createStudentRepository(config)
  return new GetStudentsWithDetailsUseCase(repository)
}

/**
 * BulkEnrollClass 유스케이스 생성 (여러 학생을 한 번에 수업에 등록)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createBulkEnrollClassUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new BulkEnrollClassUseCase(dataSource)
}

/**
 * UpdateStudentClassEnrollments 유스케이스 생성 (학생의 수업 등록 업데이트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createUpdateStudentClassEnrollmentsUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new UpdateStudentClassEnrollmentsUseCase(dataSource)
}

/**
 * CreateStudentComplete 유스케이스 생성 (학생과 보호자를 함께 생성)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createCreateStudentCompleteUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new CreateStudentCompleteUseCase(dataSource)
}

/**
 * GetStudentActivityLogs 유스케이스 생성 (학생 활동 로그 조회)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetStudentActivityLogsUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetStudentActivityLogsUseCase(dataSource)
}

/**
 * UpdateStudentProfileImage 유스케이스 생성 (학생 프로필 이미지 업데이트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createUpdateStudentProfileImageUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new UpdateStudentProfileImageUseCase(dataSource)
}
