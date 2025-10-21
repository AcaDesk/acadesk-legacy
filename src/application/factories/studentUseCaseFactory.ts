/**
 * Student Use Case Factory (Server-side)
 * 학생 유스케이스 팩토리 - 의존성 주입을 위한 팩토리 함수들
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createServerDataSource } from '@/lib/data-source-provider'
import { StudentRepository } from '@/infrastructure/database/student.repository'
import { CreateStudentUseCase } from '../use-cases/student/CreateStudentUseCase'
import { UpdateStudentUseCase } from '../use-cases/student/UpdateStudentUseCase'
import { DeleteStudentUseCase } from '../use-cases/student/DeleteStudentUseCase'
import { GetStudentUseCase } from '../use-cases/student/GetStudentUseCase'
import { WithdrawStudentUseCase } from '../use-cases/student/WithdrawStudentUseCase'

/**
 * 학생 리포지토리 생성 (서버 사이드)
 * @param config - DataSource 설정 (테스트 시 Mock 주입 가능)
 */
async function createStudentRepository(config?: DataSourceConfig) {
  const dataSource = await createServerDataSource(config)
  return new StudentRepository(dataSource)
}

/**
 * CreateStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export async function createCreateStudentUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new CreateStudentUseCase(repository)
}

/**
 * UpdateStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export async function createUpdateStudentUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new UpdateStudentUseCase(repository)
}

/**
 * DeleteStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export async function createDeleteStudentUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new DeleteStudentUseCase(repository)
}

/**
 * GetStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export async function createGetStudentUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new GetStudentUseCase(repository)
}

/**
 * WithdrawStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export async function createWithdrawStudentUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new WithdrawStudentUseCase(repository)
}
