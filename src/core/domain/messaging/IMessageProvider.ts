/**
 * Message Provider Interface - Domain Layer
 *
 * 메시지 전송 인터페이스 (SMS, LMS, 카카오톡, 이메일 등)
 * Dependency Inversion Principle 적용
 */

export enum MessageChannel {
  SMS = 'sms',        // 단문 문자 (90자 이내)
  LMS = 'lms',        // 장문 문자 (2000자 이내)
  KAKAO = 'kakao',    // 카카오톡 알림톡/친구톡
  EMAIL = 'email',    // 이메일
  PUSH = 'push',      // 푸시 알림
}

export interface MessageRecipient {
  name: string
  phone?: string      // SMS/LMS/KAKAO (01012345678 형식)
  email?: string      // EMAIL
  userId?: string     // PUSH
}

export interface MessageContent {
  subject?: string    // 제목 (LMS, EMAIL)
  body: string        // 본문
  templateId?: string // 템플릿 ID (KAKAO)
  variables?: Record<string, string> // 템플릿 변수
  attachments?: Array<{
    filename: string
    url: string
  }>
}

export interface SendMessageRequest {
  channel: MessageChannel
  recipient: MessageRecipient
  content: MessageContent
  metadata?: {
    tenantId: string
    studentId?: string
    reportId?: string
    senderId?: string
  }
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string  // 발송 ID (추적용)
  error?: string
  cost?: number       // 발송 비용 (원 단위)
  estimatedDelivery?: Date
}

export enum DeliveryStatus {
  PENDING = 'pending',     // 발송 대기
  SENT = 'sent',           // 발송 완료
  DELIVERED = 'delivered', // 전달 완료
  FAILED = 'failed',       // 실패
}

export interface DeliveryStatusResponse {
  status: DeliveryStatus
  deliveredAt?: Date
  failureReason?: string
}

/**
 * 메시지 전송 Provider 인터페이스
 *
 * 구현체:
 * - AligoProvider (SMS/LMS)
 * - KakaoProvider (알림톡/친구톡)
 * - EmailProvider (이메일)
 * - PushProvider (푸시 알림)
 */
export interface IMessageProvider {
  /** Provider가 지원하는 채널 */
  readonly channel: MessageChannel

  /** Provider 이름 (예: 'Aligo', 'KakaoTalk', 'Resend') */
  readonly name: string

  /**
   * 메시지 전송
   * @param request - 전송 요청
   * @returns 전송 결과
   */
  send(request: SendMessageRequest): Promise<SendMessageResponse>

  /**
   * 잔액 조회 (선택)
   * @returns 잔액 및 통화 단위
   */
  checkBalance?(): Promise<{ balance: number; currency: string }>

  /**
   * 전달 상태 조회 (선택)
   * @param messageId - 메시지 ID
   * @returns 전달 상태
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatusResponse>
}
