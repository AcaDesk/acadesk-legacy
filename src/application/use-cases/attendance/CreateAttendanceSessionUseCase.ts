/**
 * Create Attendance Session Use Case
 * 출석 세션 생성 유스케이스 - Application Layer
 */

import type { AttendanceRepository, CreateSessionInput } from '@/infrastructure/database/attendance.repository'
import { ValidationError } from '@/lib/error-types'
import { createSessionSchema } from '@/types/attendance'

export class CreateAttendanceSessionUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(tenantId: string, input: CreateSessionInput) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID는 필수입니다')
    }

    // Validate input
    const validated = createSessionSchema.parse(input)

    // Validate that session date is not in the future beyond reasonable limit
    const sessionDate = new Date(validated.session_date)
    const maxFutureDate = new Date()
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 3) // 3 months ahead

    if (sessionDate > maxFutureDate) {
      throw new ValidationError('세션 날짜는 3개월 이내로 설정해주세요')
    }

    // Create session
    return await this.attendanceRepository.createSession(tenantId, validated)
  }
}
