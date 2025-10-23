/**
 * Delete Attendance Session Use Case
 * 출석 세션 삭제 유스케이스 - Application Layer
 */

import type { AttendanceRepository } from '@infra/db/repositories/attendance.repository'
import { ValidationError } from '@/lib/error-types'

export class DeleteAttendanceSessionUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(sessionId: string) {
    if (!sessionId) {
      throw new ValidationError('Session ID는 필수입니다')
    }

    return await this.attendanceRepository.deleteSession(sessionId)
  }
}
