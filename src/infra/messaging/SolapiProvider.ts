/**
 * Solapi SMS/LMS Provider - Infrastructure Layer
 *
 * IMessageProvider 인터페이스 구현체 (솔라피 SDK 사용)
 * @see https://developers.solapi.com/sdk-list/Node.js
 */

import { SolapiMessageService } from 'solapi'
import {
  type IMessageProvider,
  type SendMessageRequest,
  type SendMessageResponse,
  type DeliveryStatusResponse,
  MessageChannel,
  DeliveryStatus,
} from '@/core/domain/messaging/IMessageProvider'

interface SolapiConfig {
  apiKey: string
  apiSecret: string
  senderPhone: string
}

export class SolapiProvider implements IMessageProvider {
  readonly channel: MessageChannel = MessageChannel.SMS
  readonly name: string = 'Solapi'

  private config: SolapiConfig
  private messageService: SolapiMessageService

  constructor(config?: Partial<SolapiConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.SOLAPI_API_KEY || '',
      apiSecret: config?.apiSecret || process.env.SOLAPI_API_SECRET || '',
      senderPhone: config?.senderPhone || process.env.SOLAPI_SENDER_PHONE || '',
    }

    // 설정 검증
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.senderPhone) {
      console.warn(
        '[SolapiProvider] Missing configuration. Set SOLAPI_API_KEY, SOLAPI_API_SECRET, and SOLAPI_SENDER_PHONE'
      )
    }

    // SDK 초기화
    this.messageService = new SolapiMessageService(this.config.apiKey, this.config.apiSecret)
  }

  /**
   * 메시지 전송
   */
  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 채널 검증
      if (request.channel !== MessageChannel.SMS && request.channel !== MessageChannel.LMS) {
        throw new Error(
          `Unsupported channel: ${request.channel}. SolapiProvider only supports SMS and LMS.`
        )
      }

      // 수신자 전화번호 확인
      if (!request.recipient.phone) {
        throw new Error('Recipient phone number is required for SMS/LMS')
      }

      // 테스트 모드 확인 (개발 환경)
      const isTestMode = process.env.NODE_ENV === 'development'

      if (isTestMode) {
        console.log('[SolapiProvider TEST MODE] Message would be sent:', {
          sender: this.config.senderPhone,
          receiver: request.recipient.phone,
          body: request.content.body,
          channel: request.channel,
          metadata: request.metadata,
        })

        return {
          success: true,
          messageId: `TEST_SOLAPI_${Date.now()}`,
          cost: request.channel === MessageChannel.SMS ? 8 : 24,
          estimatedDelivery: new Date(Date.now() + 1000 * 30), // 30초 후
        }
      }

      // 메시지 타입 결정
      const messageType = this.determineMessageType(request.content.body, request.channel)

      // SDK를 사용한 메시지 발송
      const messageObject = {
        to: this.sanitizePhoneNumber(request.recipient.phone),
        from: this.sanitizePhoneNumber(this.config.senderPhone),
        text: request.content.body,
        ...(messageType === 'LMS' && request.content.subject
          ? { subject: request.content.subject }
          : {}),
      }

      // SDK send 메서드 호출
      const response = await this.messageService.send(messageObject)

      // 성공 응답 - groupInfo에서 groupId 추출
      if (!response.groupInfo?.groupId) {
        return {
          success: false,
          error: 'Solapi API did not return a group ID',
        }
      }

      return {
        success: true,
        messageId: response.groupInfo.groupId,
        cost: messageType === 'SMS' ? 8 : 24, // SMS: 8원, LMS: 24원 (예상)
      }
    } catch (error) {
      console.error('[SolapiProvider.send] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 잔액 조회
   */
  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return { balance: 100000, currency: 'KRW' }
      }

      // SDK getBalance 메서드 사용
      const balanceData = await this.messageService.getBalance()

      return {
        balance: balanceData.balance || 0,
        currency: 'KRW',
      }
    } catch (error) {
      console.error('[SolapiProvider.checkBalance] Error:', error)
      throw error
    }
  }

  /**
   * 전달 상태 조회
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatusResponse> {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        }
      }

      // SDK getMessages 메서드로 메시지 조회
      const messages = await this.messageService.getMessages({
        groupId: messageId,
      })

      // messageList는 Record<string, Message> 타입이므로 배열로 변환
      const messageArray = messages.messageList ? Object.values(messages.messageList) : []

      // 첫 번째 메시지의 상태 확인
      if (messageArray.length === 0) {
        return {
          status: DeliveryStatus.PENDING,
        }
      }

      const message: any = messageArray[0]

      // 상태 매핑
      switch (message.statusCode) {
        case 'PENDING':
        case 'SENDING':
          return { status: DeliveryStatus.PENDING }
        case 'SENT':
        case 'COMPLETE':
          return {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: message.dateUpdated ? new Date(message.dateUpdated) : undefined,
          }
        case 'FAILED':
          return {
            status: DeliveryStatus.FAILED,
            failureReason: message.reason || message.statusMessage || '전송 실패',
          }
        default:
          return { status: DeliveryStatus.PENDING }
      }
    } catch (error) {
      console.error('[SolapiProvider.getDeliveryStatus] Error:', error)
      return {
        status: DeliveryStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 메시지 이력 조회 (새 기능)
   *
   * @param filters - 필터 옵션
   * @returns 메시지 목록
   */
  async getMessages(filters?: {
    limit?: number
    messageIds?: string[]
    groupId?: string
    startDate?: Date | string
    endDate?: Date | string
    type?: 'SMS' | 'LMS' | 'MMS'
  }) {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          messageList: [],
          totalCount: 0,
        }
      }

      // SDK getMessages 메서드 사용
      const params: any = {}

      if (filters?.limit) params.limit = filters.limit
      if (filters?.messageIds) params.messageIds = filters.messageIds
      if (filters?.groupId) params.groupId = filters.groupId
      if (filters?.startDate) params.startDate = filters.startDate
      if (filters?.endDate) params.endDate = filters.endDate
      if (filters?.type) params.type = filters.type

      const result = await this.messageService.getMessages(params)

      // messageList는 Record<string, Message> 타입이므로 배열로 변환
      const messageArray = result.messageList ? Object.values(result.messageList) : []

      return {
        messageList: messageArray,
        totalCount: messageArray.length,
        nextKey: result.nextKey,
      }
    } catch (error) {
      console.error('[SolapiProvider.getMessages] Error:', error)
      throw error
    }
  }

  /**
   * 통계 조회 (새 기능)
   *
   * @param startDate - 시작 날짜
   * @param endDate - 종료 날짜
   * @returns 통계 데이터
   */
  async getStatistics(startDate?: Date | string, endDate?: Date | string) {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return {
          total: 0,
          success: 0,
          pending: 0,
          failed: 0,
        }
      }

      // SDK getStatistics 메서드 사용
      const params: any = {}

      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const result = await this.messageService.getStatistics(params)

      return result
    } catch (error) {
      console.error('[SolapiProvider.getStatistics] Error:', error)
      throw error
    }
  }

  /**
   * 메시지 타입 결정 (SMS vs LMS)
   */
  private determineMessageType(body: string, channel: MessageChannel): 'SMS' | 'LMS' {
    if (channel === MessageChannel.LMS) {
      return 'LMS'
    }

    // SMS는 90바이트 이내 (한글 45자, 영문 90자)
    const bytes = Buffer.byteLength(body, 'utf-8')
    return bytes <= 90 ? 'SMS' : 'LMS'
  }

  /**
   * 전화번호 정리 (하이픈 제거)
   * Solapi는 01012345678 형식 요구
   */
  private sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '')
  }
}

/**
 * Provider 팩토리 함수
 */
export function createSolapiProvider(config?: Partial<SolapiConfig>): IMessageProvider {
  return new SolapiProvider(config)
}
