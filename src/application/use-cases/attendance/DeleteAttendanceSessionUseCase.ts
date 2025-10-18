/**
 * Delete Attendance Session Use Case
 * 출석 세션 삭제 유스케이스 - Application Layer
 */

import { AttendanceRepository } from '@/services/data/attendance.repository'
import { createClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/error-types'

export class DeleteAttendanceSessionUseCase {
  async execute(sessionId: string) {
    if (!sessionId) {
      throw new ValidationError('Session ID는 필수입니다')
    }

    const supabase = await createClient()
    const attendanceRepo = new AttendanceRepository(supabase)

    return await attendanceRepo.deleteSession(sessionId)
  }
}
