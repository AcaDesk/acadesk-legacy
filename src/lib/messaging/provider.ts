/**
 * 통합 메시지 발송 Provider
 *
 * SMS: 알리고
 * Email: Resend (또는 향후 다른 서비스)
 *
 * 사용법:
 * ```typescript
 * import { sendMessage } from '@/lib/messaging/provider'
 *
 * // SMS 발송
 * await sendMessage({
 *   type: 'sms',
 *   to: '010-1234-5678',
 *   message: '테스트 메시지',
 * })
 *
 * // 이메일 발송
 * await sendMessage({
 *   type: 'email',
 *   to: 'user@example.com',
 *   subject: '제목',
 *   message: '내용',
 * })
 * ```
 */

import { sendAligoSMS } from './aligo-sms'
import { addEmailSignature, type AcademyInfo } from './email-signature'

export interface SendMessageOptions {
  type: 'sms' | 'lms' | 'mms'
  to: string
  message: string
  subject?: string
  academyInfo?: AcademyInfo
}

/**
 * 통합 메시지 발송
 *
 * SMS, LMS, MMS를 단일 인터페이스로 발송합니다.
 *
 * @param options.type - 'sms', 'lms', 'mms'
 * @param options.to - 수신자 전화번호
 * @param options.message - 메시지 내용
 * @param options.subject - 제목 (LMS)
 * @param options.academyInfo - 학원 정보
 * @returns 발송 결과
 */
export async function sendMessage({
  type,
  to,
  message,
  subject,
  academyInfo,
}: SendMessageOptions): Promise<{
  success: boolean
  error?: string
}> {
  // All types (SMS, LMS, MMS) use the same provider
  // The provider will automatically determine the message type based on content length
  return await sendAligoSMS({
    to: [to],
    message,
    subject,
  })
}

/**
 * SMS 잔액 확인
 *
 * 알리고 SMS 잔액을 확인합니다.
 * 모니터링이나 관리자 대시보드에서 사용할 수 있습니다.
 *
 * @returns 잔액 정보
 */
export async function checkSMSBalance() {
  const { getAligoBalance } = await import('./aligo-sms')
  return await getAligoBalance()
}
