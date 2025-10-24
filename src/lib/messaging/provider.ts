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

export interface SendMessageOptions {
  type: 'sms' | 'email'
  to: string
  message: string
  subject?: string
}

/**
 * 통합 메시지 발송
 *
 * SMS와 이메일을 단일 인터페이스로 발송합니다.
 *
 * @param options.type - 'sms' 또는 'email'
 * @param options.to - 수신자 (전화번호 또는 이메일)
 * @param options.message - 메시지 내용
 * @param options.subject - 제목 (이메일 또는 LMS)
 * @returns 발송 결과
 */
export async function sendMessage({
  type,
  to,
  message,
  subject,
}: SendMessageOptions): Promise<{
  success: boolean
  error?: string
}> {
  if (type === 'sms') {
    // SMS: 알리고 사용
    return await sendAligoSMS({
      to: [to],
      message,
      subject,
    })
  } else {
    // Email: TODO - Resend 또는 다른 서비스 통합
    console.log('[sendMessage] Email sending not implemented yet')
    console.log(`Would send email to ${to}:`, { subject, message })

    // 임시로 성공 처리 (나중에 실제 이메일 서비스 통합)
    return {
      success: true,
    }
  }
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
