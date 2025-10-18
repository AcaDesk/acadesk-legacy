/**
 * Get Student Attendance Stats Use Case
 * 학생 출석 통계 조회 유스케이스 - Application Layer
 */

import { AttendanceRepository } from '@/services/data/attendance.repository'
import { createClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/error-types'

export class GetStudentAttendanceStatsUseCase {
  async execute(studentId: string, startDate?: string, endDate?: string) {
    if (!studentId) {
      throw new ValidationError('Student ID는 필수입니다')
    }

    const supabase = await createClient()
    const attendanceRepo = new AttendanceRepository(supabase)

    return await attendanceRepo.getStudentAttendanceStats(
      studentId,
      startDate,
      endDate
    )
  }
}
