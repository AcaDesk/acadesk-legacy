/**
 * Message Log Repository Interface - Domain Layer
 *
 * 메시지 전송 이력 저장 및 조회
 */

import { MessageChannel, DeliveryStatus } from '../messaging/IMessageProvider'

export interface MessageLog {
  id: string
  tenantId: string
  channel: MessageChannel
  provider: string
  recipientName: string
  recipientContact: string
  messageSubject?: string
  messageBody: string
  messageId?: string
  status: DeliveryStatus
  cost?: number
  errorMessage?: string
  metadata?: {
    studentId?: string
    reportId?: string
    senderId?: string
    [key: string]: any
  }
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IMessageLogRepository {
  /**
   * 메시지 로그 저장
   */
  create(log: Omit<MessageLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<MessageLog>

  /**
   * 메시지 로그 업데이트 (상태, 전달 시간 등)
   */
  update(
    id: string,
    updates: Partial<Pick<MessageLog, 'status' | 'deliveredAt' | 'failedAt' | 'errorMessage'>>
  ): Promise<void>

  /**
   * ID로 조회
   */
  findById(id: string): Promise<MessageLog | null>

  /**
   * 메시지 ID로 조회 (외부 서비스 ID)
   */
  findByMessageId(messageId: string): Promise<MessageLog | null>

  /**
   * 학생별 전송 이력 조회
   */
  findByStudentId(studentId: string, limit?: number): Promise<MessageLog[]>

  /**
   * 상태별 조회 (재시도용)
   */
  findByStatus(status: DeliveryStatus, limit?: number): Promise<MessageLog[]>

  /**
   * 테넌트별 최근 이력 조회
   */
  findRecent(tenantId: string, limit?: number): Promise<MessageLog[]>
}
