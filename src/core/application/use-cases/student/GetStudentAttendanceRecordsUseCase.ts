/**
 * Get Student Attendance Records Use Case
 * 학생 출석 기록 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'

export interface AttendanceRecordDTO {
  id: string
  status: string
  check_in_at: string | null
  check_out_at: string | null
  notes: string | null
  attendance_sessions: {
    session_date: string
    scheduled_start_at: string
    scheduled_end_at: string
    classes: {
      name: string
    }
  } | null
}

export class GetStudentAttendanceRecordsUseCase {
  async execute(studentId: string, limit: number = 30): Promise<AttendanceRecordDTO[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        check_in_at,
        check_out_at,
        notes,
        attendance_sessions (
          session_date,
          scheduled_start_at,
          scheduled_end_at,
          classes (
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // 테이블이 없는 경우 조용히 실패
      const errorMessage = error.message || String(error)
      if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
        logError(error, {
          useCase: 'GetStudentAttendanceRecordsUseCase',
          method: 'execute',
          studentId
        })
      }
      return []
    }

    return (data || []) as unknown as AttendanceRecordDTO[]
  }
}
