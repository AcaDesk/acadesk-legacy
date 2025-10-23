/**
 * Bulk Notify Absent Students Use Case
 * 결석 학생들에게 일괄 알림 전송 유스케이스
 */

import type { AttendanceRepository } from '@/infrastructure/database/attendance.repository'

export interface NotificationInput {
  student_id: string
  student_name: string
  session_id: string
  session_date: string
}

export interface BulkNotifyAbsentStudentsOutput {
  successCount: number
  failedCount: number
  error: Error | null
}

export class BulkNotifyAbsentStudentsUseCase {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async execute(notifications: NotificationInput[]): Promise<BulkNotifyAbsentStudentsOutput> {
    try {
      // Prepare notification logs
      const notificationLogs = notifications.map((n) => ({
        student_id: n.student_id,
        session_id: n.session_id,
        notification_type: 'sms',
        status: 'sent',
        message: `${n.student_name} 학생이 ${n.session_date} 수업에 결석했습니다.`,
        sent_at: new Date().toISOString(),
      }))

      // Insert all notification logs
      await this.attendanceRepository.bulkInsertNotificationLogs(notificationLogs)

      return {
        successCount: notifications.length,
        failedCount: 0,
        error: null,
      }
    } catch (error) {
      console.error('[BulkNotifyAbsentStudentsUseCase] Error:', error)
      return {
        successCount: 0,
        failedCount: notifications.length,
        error: error as Error,
      }
    }
  }
}
