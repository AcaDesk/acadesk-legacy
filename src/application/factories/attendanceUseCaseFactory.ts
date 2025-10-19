/**
 * Attendance Use Case Factory
 * 출석 관련 Use Case들의 의존성 주입을 담당
 */

import { GetAttendanceSessionsUseCase } from '@/application/use-cases/attendance/GetAttendanceSessionsUseCase'
import { GetAttendanceSessionUseCase } from '@/application/use-cases/attendance/GetAttendanceSessionUseCase'
import { CreateAttendanceSessionUseCase } from '@/application/use-cases/attendance/CreateAttendanceSessionUseCase'
import { UpdateAttendanceSessionStatusUseCase } from '@/application/use-cases/attendance/UpdateAttendanceSessionStatusUseCase'
import { DeleteAttendanceSessionUseCase } from '@/application/use-cases/attendance/DeleteAttendanceSessionUseCase'
import { UpsertAttendanceUseCase } from '@/application/use-cases/attendance/UpsertAttendanceUseCase'
import { BulkUpsertAttendanceUseCase } from '@/application/use-cases/attendance/BulkUpsertAttendanceUseCase'
import { GetStudentAttendanceStatsUseCase } from '@/application/use-cases/attendance/GetStudentAttendanceStatsUseCase'

/**
 * Get Attendance Sessions Use Case
 */
export function createGetAttendanceSessionsUseCase() {
  return new GetAttendanceSessionsUseCase()
}

/**
 * Get Attendance Session Use Case
 */
export function createGetAttendanceSessionUseCase() {
  return new GetAttendanceSessionUseCase()
}

/**
 * Create Attendance Session Use Case
 */
export function createCreateAttendanceSessionUseCase() {
  return new CreateAttendanceSessionUseCase()
}

/**
 * Update Attendance Session Status Use Case
 */
export function createUpdateAttendanceSessionStatusUseCase() {
  return new UpdateAttendanceSessionStatusUseCase()
}

/**
 * Delete Attendance Session Use Case
 */
export function createDeleteAttendanceSessionUseCase() {
  return new DeleteAttendanceSessionUseCase()
}

/**
 * Upsert Attendance Use Case
 */
export function createUpsertAttendanceUseCase() {
  return new UpsertAttendanceUseCase()
}

/**
 * Bulk Upsert Attendance Use Case
 */
export function createBulkUpsertAttendanceUseCase() {
  return new BulkUpsertAttendanceUseCase()
}

/**
 * Get Student Attendance Stats Use Case
 */
export function createGetStudentAttendanceStatsUseCase() {
  return new GetStudentAttendanceStatsUseCase()
}
