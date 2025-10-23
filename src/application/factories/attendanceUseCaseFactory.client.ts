/**
 * Attendance Use Case Factory (Client-side)
 * 출석 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createClientDataSource } from '@/lib/data-source-provider'
import { AttendanceRepository } from '@/infrastructure/database/attendance.repository'
import { UpdateAttendanceSessionStatusUseCase } from '@/application/use-cases/attendance/UpdateAttendanceSessionStatusUseCase'
import { BulkNotifyAbsentStudentsUseCase } from '@/application/use-cases/attendance/BulkNotifyAbsentStudentsUseCase'
import { BulkUpsertAttendanceUseCase } from '@/application/use-cases/attendance/BulkUpsertAttendanceUseCase'

/**
 * 출석 리포지토리 생성 (클라이언트 사이드)
 * @param config - DataSource 설정 (테스트 시 Mock 주입 가능)
 */
function createAttendanceRepository(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new AttendanceRepository(dataSource)
}

/**
 * UpdateAttendanceSessionStatus 유스케이스 생성 (클라이언트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createUpdateAttendanceSessionStatusUseCase(config?: DataSourceConfig) {
  const repository = createAttendanceRepository(config)
  return new UpdateAttendanceSessionStatusUseCase(repository)
}

/**
 * BulkNotifyAbsentStudents 유스케이스 생성 (클라이언트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createBulkNotifyAbsentStudentsUseCase(config?: DataSourceConfig) {
  const repository = createAttendanceRepository(config)
  return new BulkNotifyAbsentStudentsUseCase(repository)
}

/**
 * BulkUpsertAttendance 유스케이스 생성 (클라이언트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createBulkUpsertAttendanceUseCase(config?: DataSourceConfig) {
  const repository = createAttendanceRepository(config)
  return new BulkUpsertAttendanceUseCase(repository)
}
