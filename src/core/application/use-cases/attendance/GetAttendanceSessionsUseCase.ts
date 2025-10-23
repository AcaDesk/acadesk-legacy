/**
 * Get Attendance Sessions Use Case
 * 출석 세션 목록 조회 유스케이스 - Application Layer
 */

import type { AttendanceRepository } from '@infra/db/repositories/attendance.repository'
import { ValidationError } from '@/lib/error-types'

export interface GetSessionsOptions {
  classId?: string
  startDate?: string
  endDate?: string
  status?: string
}

export class GetAttendanceSessionsUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(tenantId: string, options?: GetSessionsOptions) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID는 필수입니다')
    }

    return await this.attendanceRepository.getSessionsByTenant(tenantId, options)
  }
}
