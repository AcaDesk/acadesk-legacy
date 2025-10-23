/**
 * Get Attendance Session Use Case
 * 출석 세션 단일 조회 유스케이스 - Application Layer
 */

import type { AttendanceRepository } from '@infra/db/repositories/attendance.repository'
import { ValidationError, NotFoundError } from '@/lib/error-types'

export class GetAttendanceSessionUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(sessionId: string) {
    if (!sessionId) {
      throw new ValidationError('Session ID는 필수입니다')
    }

    const session = await this.attendanceRepository.getSessionById(sessionId)

    if (!session) {
      throw new NotFoundError('출석 세션')
    }

    return session
  }
}
