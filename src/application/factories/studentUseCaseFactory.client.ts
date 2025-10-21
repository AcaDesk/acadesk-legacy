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
import { GetUniqueGradesUseCase } from '../use-cases/student/GetUniqueGradesUseCase'
import { GetUniqueSchoolsUseCase } from '../use-cases/student/GetUniqueSchoolsUseCase'
import { WithdrawStudentUseCase } from '../use-cases/student/WithdrawStudentUseCase'

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
