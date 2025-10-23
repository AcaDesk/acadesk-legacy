/**
 * Message Log Repository Implementation - Infrastructure Layer
 */

import {
  IMessageLogRepository,
  MessageLog,
} from '@core/domain/repositories/IMessageLogRepository'
import { IDataSource } from '@core/domain/data-sources/IDataSource'
import { DeliveryStatus } from '@core/domain/messaging/IMessageProvider'
import { DatabaseError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export class MessageLogRepository implements IMessageLogRepository {
  constructor(private dataSource: IDataSource) {}

  async create(
    log: Omit<MessageLog, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MessageLog> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .insert({
          tenant_id: log.tenantId,
          channel: log.channel,
          provider: log.provider,
          recipient_name: log.recipientName,
          recipient_contact: log.recipientContact,
          message_subject: log.messageSubject,
          message_body: log.messageBody,
          message_id: log.messageId,
          status: log.status,
          cost: log.cost,
          error_message: log.errorMessage,
          metadata: log.metadata,
          sent_at: log.sentAt?.toISOString(),
          delivered_at: log.deliveredAt?.toISOString(),
          failed_at: log.failedAt?.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      return this.mapToMessageLog(data)
    } catch (error) {
      logError(error, { repository: 'MessageLogRepository', method: 'create' })
      throw new DatabaseError('메시지 로그 생성 실패')
    }
  }

  async update(
    id: string,
    updates: Partial<Pick<MessageLog, 'status' | 'deliveredAt' | 'failedAt' | 'errorMessage'>>
  ): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('message_logs')
        .update({
          status: updates.status,
          delivered_at: updates.deliveredAt?.toISOString(),
          failed_at: updates.failedAt?.toISOString(),
          error_message: updates.errorMessage,
        })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logError(error, { repository: 'MessageLogRepository', method: 'update', id })
      throw new DatabaseError('메시지 로그 업데이트 실패')
    }
  }

  async findById(id: string): Promise<MessageLog | null> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return this.mapToMessageLog(data)
    } catch (error) {
      logError(error, { repository: 'MessageLogRepository', method: 'findById', id })
      throw new DatabaseError('메시지 로그 조회 실패')
    }
  }

  async findByMessageId(messageId: string): Promise<MessageLog | null> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .select('*')
        .eq('message_id', messageId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return this.mapToMessageLog(data)
    } catch (error) {
      logError(error, {
        repository: 'MessageLogRepository',
        method: 'findByMessageId',
        messageId,
      })
      return null
    }
  }

  async findByStudentId(studentId: string, limit: number = 50): Promise<MessageLog[]> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .select('*')
        .eq('metadata->>studentId', studentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => this.mapToMessageLog(row))
    } catch (error) {
      logError(error, {
        repository: 'MessageLogRepository',
        method: 'findByStudentId',
        studentId,
      })
      return []
    }
  }

  async findByStatus(status: DeliveryStatus, limit: number = 100): Promise<MessageLog[]> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => this.mapToMessageLog(row))
    } catch (error) {
      logError(error, { repository: 'MessageLogRepository', method: 'findByStatus', status })
      return []
    }
  }

  async findRecent(tenantId: string, limit: number = 50): Promise<MessageLog[]> {
    try {
      const { data, error } = await this.dataSource
        .from('message_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return ((data as any[]) || []).map((row: any) => this.mapToMessageLog(row))
    } catch (error) {
      logError(error, {
        repository: 'MessageLogRepository',
        method: 'findRecent',
        tenantId,
      })
      return []
    }
  }

  private mapToMessageLog(row: any): MessageLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      channel: row.channel,
      provider: row.provider,
      recipientName: row.recipient_name,
      recipientContact: row.recipient_contact,
      messageSubject: row.message_subject,
      messageBody: row.message_body,
      messageId: row.message_id,
      status: row.status,
      cost: row.cost ? parseFloat(row.cost) : undefined,
      errorMessage: row.error_message,
      metadata: row.metadata,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
