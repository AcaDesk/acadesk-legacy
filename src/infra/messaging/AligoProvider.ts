/**
 * Aligo SMS/LMS Provider - Infrastructure Layer
 *
 * IMessageProvider 인터페이스 구현체 (알리고 API)
 * @see https://smartsms.aligo.in/admin/api/spec.html
 */

import {
  type IMessageProvider,
  type SendMessageRequest,
  type SendMessageResponse,
  type DeliveryStatusResponse,
  MessageChannel,
  DeliveryStatus,
} from '@/core/domain/messaging/IMessageProvider'

interface AligoConfig {
  apiKey: string
  userId: string
  senderPhone: string
}

interface AligoApiResponse {
  result_code: string // 성공: '1', 실패: '-1' 등
  message: string
  msg_id?: string
  success_cnt?: number
  error_cnt?: number
  msg_type?: string
}

interface AligoListResponse {
  result_code: string
  message: string
  list?: Array<{
    mid: string
    type: string
    sender: string
    receiver: string
    msg: string
    reserve_date: string
    sms_state: string // 0:대기, 1:성공, 2:실패
    reg_date: string
  }>
  total_count?: number
}

interface AligoRemainResponse {
  result_code: string
  message: string
  SMS_CNT?: string // 잔여 SMS 건수
  LMS_CNT?: string // 잔여 LMS 건수
  MMS_CNT?: string // 잔여 MMS 건수
}

export class AligoProvider implements IMessageProvider {
  readonly channel: MessageChannel = MessageChannel.SMS
  readonly name: string = 'Aligo'

  private config: AligoConfig

  constructor(config?: Partial<AligoConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.ALIGO_API_KEY || '',
      userId: config?.userId || process.env.ALIGO_USER_ID || '',
      senderPhone: config?.senderPhone || process.env.ALIGO_SENDER_PHONE || '',
    }

    // 설정 검증
    if (!this.config.apiKey || !this.config.userId || !this.config.senderPhone) {
      console.warn(
        '[AligoProvider] Missing configuration. Set ALIGO_API_KEY, ALIGO_USER_ID, and ALIGO_SENDER_PHONE'
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
        throw new Error(`Unsupported channel: ${request.channel}. AligoProvider only supports SMS and LMS.`)
      }

      // 수신자 전화번호 확인
      if (!request.recipient.phone) {
        throw new Error('Recipient phone number is required for SMS/LMS')
      }

      // 테스트 모드 확인 (개발 환경)
      const isTestMode = process.env.NODE_ENV === 'development'

      if (isTestMode) {
        console.log('[AligoProvider TEST MODE] Message would be sent:', {
          sender: this.config.senderPhone,
          receiver: request.recipient.phone,
          body: request.content.body,
          channel: request.channel,
          metadata: request.metadata,
        })

        return {
          success: true,
          messageId: `TEST_${Date.now()}`,
          cost: request.channel === MessageChannel.SMS ? 10 : 30,
          estimatedDelivery: new Date(Date.now() + 1000 * 60), // 1분 후
        }
      }

      // 메시지 타입 결정
      const messageType = this.determineMessageType(request.content.body, request.channel)

      // API 호출
      const formData = new URLSearchParams({
        key: this.config.apiKey,
        user_id: this.config.userId,
        sender: this.sanitizePhoneNumber(this.config.senderPhone),
        receiver: this.sanitizePhoneNumber(request.recipient.phone),
        msg: request.content.body,
        msg_type: messageType,
        title: request.content.subject || '',
        testmode_yn: 'N',
      })

      const response = await fetch('https://apis.aligo.in/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`Aligo API request failed: ${response.status} ${response.statusText}`)
      }

      const data: AligoApiResponse = await response.json()

      // 결과 확인
      if (data.result_code !== '1' || !data.msg_id) {
        return {
          success: false,
          error: `Aligo API error: ${data.message}`,
        }
      }

      return {
        success: true,
        messageId: data.msg_id,
        cost: messageType === 'SMS' ? 10 : 30, // SMS: 10원, LMS: 30원 (예상)
      }
    } catch (error) {
      console.error('[AligoProvider.send] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 잔액 조회 — 알리고 `/remain/` API
   *
   * 알리고는 prepaid 모델로, 응답은 메시지 타입별 잔여 발송 건수.
   * 인터페이스 통일을 위해 SMS 잔여 건수를 balance, currency='SMS_COUNT' 로 반환.
   * (KRW 환산이 필요하면 호출 측에서 SMS 단가를 곱해 처리)
   */
  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      // 테스트 모드
      if (process.env.NODE_ENV === 'development') {
        return { balance: 10000, currency: 'SMS_COUNT' }
      }

      // 설정 검증
      if (!this.config.apiKey || !this.config.userId) {
        throw new Error('Aligo API 인증 정보(ALIGO_API_KEY, ALIGO_USER_ID)가 설정되지 않았습니다.')
      }

      const formData = new URLSearchParams({
        key: this.config.apiKey,
        user_id: this.config.userId,
      })

      const response = await fetch('https://apis.aligo.in/remain/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`Aligo API request failed: ${response.status} ${response.statusText}`)
      }

      const data: AligoRemainResponse = await response.json()

      if (data.result_code !== '1') {
        throw new Error(`Aligo 잔액 조회 실패: ${data.message}`)
      }

      const smsCount = Number.parseInt(data.SMS_CNT ?? '0', 10) || 0

      return {
        balance: smsCount,
        currency: 'SMS_COUNT',
      }
    } catch (error) {
      console.error('[AligoProvider.checkBalance] Error:', error)
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

      // 실제 API 호출
      const formData = new URLSearchParams({
        key: this.config.apiKey,
        user_id: this.config.userId,
        mid: messageId,
        page: '1',
        page_size: '1',
      })

      const response = await fetch('https://apis.aligo.in/list/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`Aligo API request failed: ${response.status}`)
      }

      const data: AligoListResponse = await response.json()

      if (data.result_code !== '1' || !data.list || data.list.length === 0) {
        return {
          status: DeliveryStatus.FAILED,
          failureReason: '메시지를 찾을 수 없습니다',
        }
      }

      const sms = data.list[0]

      // sms_state: 0=대기, 1=성공, 2=실패
      switch (sms.sms_state) {
        case '0':
          return { status: DeliveryStatus.PENDING }
        case '1':
          return {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: new Date(sms.reg_date),
          }
        case '2':
          return {
            status: DeliveryStatus.FAILED,
            failureReason: '전송 실패',
          }
        default:
          return { status: DeliveryStatus.PENDING }
      }
    } catch (error) {
      console.error('[AligoProvider.getDeliveryStatus] Error:', error)
      return {
        status: DeliveryStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      }
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
export function createAligoProvider(config?: Partial<AligoConfig>): IMessageProvider {
  return new AligoProvider(config)
}
