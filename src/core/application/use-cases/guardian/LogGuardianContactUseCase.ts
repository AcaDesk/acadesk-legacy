/**
 * Log Guardian Contact Use Case
 * 보호자 연락 기록 유스케이스
 */

import type { IDataSource } from '@core/domain/data-sources/IDataSource'

export interface LogGuardianContactInput {
  tenantId: string
  studentId: string
  guardianId: string
  sessionId: string
  notificationType: string
  message: string
  notes?: string
}

export interface LogGuardianContactOutput {
  success: boolean
  error: Error | null
}

export class LogGuardianContactUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: LogGuardianContactInput): Promise<LogGuardianContactOutput> {
    try {
      const { error } = await this.dataSource
        .from('notification_logs')
        .insert({
          tenant_id: input.tenantId,
          student_id: input.studentId,
          guardian_id: input.guardianId,
          session_id: input.sessionId,
          notification_type: input.notificationType,
          status: 'sent',
          message: input.message,
          notes: input.notes || null,
          sent_at: new Date().toISOString(),
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[LogGuardianContactUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
