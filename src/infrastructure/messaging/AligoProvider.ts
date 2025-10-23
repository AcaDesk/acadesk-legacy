/**
 * Aligo SMS/LMS Provider - Infrastructure Layer
 *
 * 알리고 API를 통한 SMS/LMS 전송
 * https://smartsms.aligo.in/admin/api/spec.html
 */

import {
  IMessageProvider,
  MessageChannel,
  SendMessageRequest,
  SendMessageResponse,
  DeliveryStatus,
  DeliveryStatusResponse,
} from '@/domain/messaging/IMessageProvider'
import { logError } from '@/lib/error-handlers'

interface AligoSendResponse {
  result_code: string
  message: string
  msg_id?: string
  success_cnt?: string
  error_cnt?: string
  msg_type?: string
}

interface AligoBalanceResponse {
  result_code: string
  SMS_CNT?: string
  LMS_CNT?: string
  MMS_CNT?: string
}

export class AligoProvider implements IMessageProvider {
  readonly channel: MessageChannel
  readonly name = 'Aligo'

  private apiKey: string
  private userId: string
  private senderPhone: string
  private baseUrl = 'https://apis.aligo.in'

  constructor(channel: MessageChannel = MessageChannel.SMS) {
    this.channel = channel

    // 환경변수 검증
    this.apiKey = process.env.ALIGO_API_KEY || ''
    this.userId = process.env.ALIGO_USER_ID || ''
    this.senderPhone = process.env.ALIGO_SENDER_PHONE || ''

    if (!this.apiKey || !this.userId || !this.senderPhone) {
      throw new Error(
        'Aligo credentials not configured. Please set ALIGO_API_KEY, ALIGO_USER_ID, and ALIGO_SENDER_PHONE in environment variables.'
      )
    }

    // 발신번호 형식 검증 (하이픈 제거)
    this.senderPhone = this.senderPhone.replace(/-/g, '')
  }

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 수신번호 검증 및 포맷팅
      if (!request.recipient.phone) {
        return {
          success: false,
          error: '수신번호가 없습니다',
        }
      }

      const receiverPhone = request.recipient.phone.replace(/-/g, '')

      // 메시지 타입 결정
      const messageBody = request.content.body
      const messageType = messageBody.length <= 90 ? 'SMS' : 'LMS'

      // 알리고 API 요청 파라미터
      const formData = new URLSearchParams({
        key: this.apiKey,
        user_id: this.userId,
        sender: this.senderPhone,
        receiver: receiverPhone,
        msg: messageBody,
        msg_type: messageType,
        // 제목 (LMS만)
        ...(messageType === 'LMS' && request.content.subject
          ? { title: request.content.subject }
          : {}),
        // 테스트 모드 (개발/스테이징 환경)
        testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
      })

      const response = await fetch(`${this.baseUrl}/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`Aligo API HTTP error: ${response.status}`)
      }

      const data: AligoSendResponse = await response.json()

      // 알리고 응답 코드
      // 1: 성공
      // -100~-199: 시스템 에러
      // -200~-299: 발송 실패
      if (data.result_code === '1') {
        // 비용 계산 (SMS: 15원, LMS: 45원)
        const cost = messageType === 'SMS' ? 15 : 45

        return {
          success: true,
          messageId: data.msg_id,
          cost,
        }
      } else {
        // 에러 로깅
        logError(new Error(`Aligo send failed: ${data.message}`), {
          tag: 'AligoProvider',
          resultCode: data.result_code,
          recipient: request.recipient.name,
        })

        return {
          success: false,
          error: `알리고 전송 실패 (${data.result_code}): ${data.message}`,
        }
      }
    } catch (error) {
      logError(error, {
        tag: 'AligoProvider',
        method: 'send',
        recipient: request.recipient.name,
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      }
    }
  }

  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const formData = new URLSearchParams({
        key: this.apiKey,
        user_id: this.userId,
      })

      const response = await fetch(`${this.baseUrl}/remain/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`Aligo API HTTP error: ${response.status}`)
      }

      const data: AligoBalanceResponse = await response.json()

      if (data.result_code !== '1') {
        throw new Error(`Aligo balance check failed: ${data.result_code}`)
      }

      // SMS + LMS + MMS 합계
      const totalBalance =
        parseFloat(data.SMS_CNT || '0') +
        parseFloat(data.LMS_CNT || '0') +
        parseFloat(data.MMS_CNT || '0')

      return {
        balance: totalBalance,
        currency: 'credits',
      }
    } catch (error) {
      logError(error, { tag: 'AligoProvider', method: 'checkBalance' })
      throw new Error('알리고 잔액 조회 실패')
    }
  }

  async getDeliveryStatus(_messageId: string): Promise<DeliveryStatusResponse> {
    // 알리고는 실시간 전달 상태 조회 API가 제한적
    // 전달 상태는 콜백(Webhook)으로 처리하거나 별도 조회 API 사용
    // 현재는 기본값 반환
    return {
      status: DeliveryStatus.PENDING,
    }
  }
}
