/**
 * Get Student Attendance Stats Use Case
 * 학생 출석 통계 조회 유스케이스 - Application Layer
 */

import { AttendanceRepository } from '@/infrastructure/database/attendance.repository'
import { ValidationError } from '@/lib/error-types'

export class GetStudentAttendanceStatsUseCase {
  async execute(studentId: string, startDate?: string, endDate?: string) {
    if (!studentId) {
      throw new ValidationError('Student ID는 필수입니다')
    }

    return await AttendanceRepository.getStudentAttendanceStats(
      studentId,
      startDate,
      endDate
    )
  }
}
