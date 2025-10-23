/**
 * Upsert Attendance Use Case
 * 출석 기록 생성/업데이트 유스케이스 - Application Layer
 */

import type { AttendanceRepository, UpdateAttendanceInput } from '@infra/db/repositories/attendance.repository'
import { ValidationError } from '@/lib/error-types'
import { updateAttendanceSchema } from '@/core/types/attendance'

export class UpsertAttendanceUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(
    tenantId: string,
    sessionId: string,
    studentId: string,
    input: UpdateAttendanceInput
  ) {
    if (!tenantId || !sessionId || !studentId) {
      throw new ValidationError('Tenant ID, Session ID, Student ID는 필수입니다')
    }

    // Validate input
    const validated = updateAttendanceSchema.parse(input)

    // Auto-set check_in_at for present/late status if not provided
    if (
      (validated.status === 'present' || validated.status === 'late') &&
      !validated.check_in_at
    ) {
      validated.check_in_at = new Date().toISOString()
    }

    return await this.attendanceRepository.upsertAttendance(
      tenantId,
      sessionId,
      studentId,
      validated
    )
  }
}
