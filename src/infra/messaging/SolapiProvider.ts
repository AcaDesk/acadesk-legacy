/**
 * Solapi SMS/LMS Provider - Infrastructure Layer
 *
 * IMessageProvider 인터페이스 구현체 (솔라피 API)
 * @see https://docs.solapi.com
 */

import crypto from 'crypto'
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

interface SolapiSendResponse {
  groupId?: string
  messageId?: string
  statusCode?: string
  statusMessage?: string
  errorCode?: string
  errorMessage?: string
}

interface SolapiMessageStatusResponse {
  statusCode: string // PENDING, SENDING, SENT, FAILED
  statusMessage: string
  messageId: string
  groupId: string
  to: string
  from: string
  type: string
  reason?: string
  sentAt?: string
  failedAt?: string
}

export class SolapiProvider implements IMessageProvider {
  readonly channel: MessageChannel = MessageChannel.SMS
  readonly name: string = 'Solapi'

  private config: SolapiConfig
  private readonly apiBaseUrl = 'https://api.solapi.com'

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

      // API 요청 본문
      const requestBody = {
        message: {
          to: this.sanitizePhoneNumber(request.recipient.phone),
          from: this.sanitizePhoneNumber(this.config.senderPhone),
          text: request.content.body,
          ...(messageType === 'LMS' && request.content.subject
            ? { subject: request.content.subject }
            : {}),
          type: messageType,
        },
      }

      // HMAC 인증 헤더 생성
      const headers = this.generateAuthHeaders('POST', '/messages/v4/send', requestBody)

      // API 호출
      const response = await fetch(`${this.apiBaseUrl}/messages/v4/send`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data: SolapiSendResponse = await response.json()

      // 에러 응답 확인
      if (!response.ok || data.errorCode) {
        return {
          success: false,
          error: `Solapi API error: ${data.errorMessage || data.statusMessage || 'Unknown error'}`,
        }
      }

      // 성공 응답
      if (!data.groupId) {
        return {
          success: false,
          error: 'Solapi API did not return a group ID',
        }
      }

      return {
        success: true,
        messageId: data.groupId,
        cost: messageType === 'SMS' ? 8 : 24, // SMS: 8원, LMS: 24원 (예상, 실제 요금은 솔라피 플랜에 따라 다름)
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

      // HMAC 인증 헤더 생성
      const headers = this.generateAuthHeaders('GET', '/cash/v1/balance')

      // API 호출
      const response = await fetch(`${this.apiBaseUrl}/cash/v1/balance`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Solapi balance check failed: ${response.status}`)
      }

      const data = await response.json()

      return {
        balance: data.balance || 0,
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

      // HMAC 인증 헤더 생성
      const headers = this.generateAuthHeaders('GET', `/messages/v4/groups/${messageId}`)

      // API 호출
      const response = await fetch(`${this.apiBaseUrl}/messages/v4/groups/${messageId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Solapi status check failed: ${response.status}`)
      }

      const data: SolapiMessageStatusResponse = await response.json()

      // 상태 매핑
      switch (data.statusCode) {
        case 'PENDING':
        case 'SENDING':
          return { status: DeliveryStatus.PENDING }
        case 'SENT':
          return {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: data.sentAt ? new Date(data.sentAt) : undefined,
          }
        case 'FAILED':
          return {
            status: DeliveryStatus.FAILED,
            failureReason: data.reason || '전송 실패',
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
   * HMAC-SHA256 인증 헤더 생성
   * Solapi API는 요청마다 HMAC 서명을 요구합니다
   */
  private generateAuthHeaders(
    method: string,
    path: string,
    body?: any
  ): Record<string, string> {
    const date = new Date().toISOString()
    const salt = crypto.randomBytes(16).toString('hex')

    // 서명할 데이터 생성
    const stringToSign = `${date}${salt}`

    // HMAC-SHA256 서명 생성
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(stringToSign)
      .digest('hex')

    return {
      Authorization: `HMAC-SHA256 apiKey=${this.config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    }
  }

  /**
   * 메시지 타입 결정 (SMS vs LMS)
   */
  private determineMessageType(body: string, channel: MessageChannel): 'SMS' | 'LMS' {
    if (channel === MessageChannel.LMS) {
      return 'LMS'
    }

    // SMS는 90바이트 이내
    const bytes = Buffer.byteLength(body, 'utf-8')
    return bytes <= 90 ? 'SMS' : 'LMS'
  }

  /**
   * 전화번호 정리 (하이픈 제거)
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
