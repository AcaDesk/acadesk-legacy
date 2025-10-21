/**
 * Attendance Use Case Factory (Server-side)
 * 출석 관련 Use Case들의 의존성 주입을 담당
 */

import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createServerDataSource } from '@/lib/data-source-provider'
import { AttendanceRepository } from '@/infrastructure/database/attendance.repository'
import { GetAttendanceSessionsUseCase } from '@/application/use-cases/attendance/GetAttendanceSessionsUseCase'
import { GetAttendanceSessionUseCase } from '@/application/use-cases/attendance/GetAttendanceSessionUseCase'
import { CreateAttendanceSessionUseCase } from '@/application/use-cases/attendance/CreateAttendanceSessionUseCase'
import { UpdateAttendanceSessionStatusUseCase } from '@/application/use-cases/attendance/UpdateAttendanceSessionStatusUseCase'
import { DeleteAttendanceSessionUseCase } from '@/application/use-cases/attendance/DeleteAttendanceSessionUseCase'
import { UpsertAttendanceUseCase } from '@/application/use-cases/attendance/UpsertAttendanceUseCase'
import { BulkUpsertAttendanceUseCase } from '@/application/use-cases/attendance/BulkUpsertAttendanceUseCase'
import { GetStudentAttendanceStatsUseCase } from '@/application/use-cases/attendance/GetStudentAttendanceStatsUseCase'

/**
 * 출석 리포지토리 생성 (서버 사이드)
 * @param config - DataSource 설정 (테스트 시 Mock 주입 가능)
 */
async function createAttendanceRepository(config?: DataSourceConfig) {
  const dataSource = await createServerDataSource(config)
  return new AttendanceRepository(dataSource)
}

/**
 * Get Attendance Sessions Use Case
 */
export async function createGetAttendanceSessionsUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new GetAttendanceSessionsUseCase(repository)
}

/**
 * Get Attendance Session Use Case
 */
export async function createGetAttendanceSessionUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new GetAttendanceSessionUseCase(repository)
}

/**
 * Create Attendance Session Use Case
 */
export async function createCreateAttendanceSessionUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new CreateAttendanceSessionUseCase(repository)
}

/**
 * Update Attendance Session Status Use Case
 */
export async function createUpdateAttendanceSessionStatusUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new UpdateAttendanceSessionStatusUseCase(repository)
}

/**
 * Delete Attendance Session Use Case
 */
export async function createDeleteAttendanceSessionUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new DeleteAttendanceSessionUseCase(repository)
}

/**
 * Upsert Attendance Use Case
 */
export async function createUpsertAttendanceUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new UpsertAttendanceUseCase(repository)
}

/**
 * Bulk Upsert Attendance Use Case
 */
export async function createBulkUpsertAttendanceUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new BulkUpsertAttendanceUseCase(repository)
}

/**
 * Get Student Attendance Stats Use Case
 */
export async function createGetStudentAttendanceStatsUseCase(config?: DataSourceConfig) {
  const repository = await createAttendanceRepository(config)
  return new GetStudentAttendanceStatsUseCase(repository)
}
