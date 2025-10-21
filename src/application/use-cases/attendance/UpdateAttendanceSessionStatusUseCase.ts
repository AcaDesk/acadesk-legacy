/**
 * Update Attendance Session Status Use Case
 * 출석 세션 상태 업데이트 유스케이스 - Application Layer
 */

import type { AttendanceRepository } from '@/infrastructure/database/attendance.repository'
import { ValidationError } from '@/lib/error-types'

export class UpdateAttendanceSessionStatusUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(
    sessionId: string,
    status: string,
    actualStartAt?: string,
    actualEndAt?: string
  ) {
    if (!sessionId) {
      throw new ValidationError('Session ID는 필수입니다')
    }

    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw new ValidationError('유효하지 않은 세션 상태입니다')
    }

    // Validate times if provided
    if (actualStartAt && actualEndAt) {
      const start = new Date(actualStartAt)
      const end = new Date(actualEndAt)

      if (end <= start) {
        throw new ValidationError('실제 종료 시간은 시작 시간보다 늦어야 합니다')
      }
    }

    return await this.attendanceRepository.updateSessionStatus(
      sessionId,
      status,
      actualStartAt,
      actualEndAt
    )
  }
}
