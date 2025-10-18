/**
 * Get Attendance Sessions Use Case
 * 출석 세션 목록 조회 유스케이스 - Application Layer
 */

import { AttendanceRepository } from '@/services/data/attendance.repository'
import { createClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/error-types'

export interface GetSessionsOptions {
  classId?: string
  startDate?: string
  endDate?: string
  status?: string
}

export class GetAttendanceSessionsUseCase {
  async execute(tenantId: string, options?: GetSessionsOptions) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID는 필수입니다')
    }

    const supabase = await createClient()
    const attendanceRepo = new AttendanceRepository(supabase)

    return await attendanceRepo.getSessionsByTenant(tenantId, options)
  }
}
