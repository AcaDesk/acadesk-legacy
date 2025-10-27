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
 * tenant의 messaging config에 설정된 provider를 사용합니다.
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
  messageId?: string
  error?: string
}> {
  try {
    // Get tenant's messaging config
    const { createServiceRoleClient } = await import('@/lib/supabase/service-role')
    const { verifyStaff } = await import('@/lib/auth/verify-permission')

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) {
      throw new Error('메시징 설정을 가져오는 중 오류가 발생했습니다: ' + configError.message)
    }

    if (!config) {
      throw new Error('활성화된 메시징 서비스가 없습니다. 설정 페이지에서 메시징 서비스를 설정하고 활성화해주세요.')
    }

    // Create provider based on config
    if (config.provider === 'aligo') {
      const aligoResult = await sendAligoSMS({
        to: [to],
        message,
        subject,
      })
      return {
        success: aligoResult.success,
        messageId: aligoResult.success ? `ALIGO_${Date.now()}` : undefined,
        error: aligoResult.error,
      }
    } else if (config.provider === 'solapi') {
      const { SolapiProvider } = await import('@/infra/messaging/SolapiProvider')
      const { MessageChannel } = await import('@/core/domain/messaging/IMessageProvider')

      const provider = new SolapiProvider({
        apiKey: config.solapi_api_key || '',
        apiSecret: config.solapi_api_secret || '',
        senderPhone: config.solapi_sender_phone || '',
      })

      // Map type to MessageChannel
      let channel: typeof MessageChannel[keyof typeof MessageChannel]
      if (type === 'lms') {
        channel = MessageChannel.LMS
      } else if (type === 'mms') {
        channel = MessageChannel.MMS
      } else {
        channel = MessageChannel.SMS
      }

      const result = await provider.send({
        channel,
        recipient: {
          name: '', // Name not required for SMS
          phone: to,
        },
        content: {
          body: message,
          subject: subject,
        },
        metadata: {
          tenantId,
        },
      })

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      }
    } else if (config.provider === 'nhncloud') {
      throw new Error('NHN Cloud provider는 아직 구현되지 않았습니다.')
    }

    throw new Error('지원되지 않는 메시징 provider입니다: ' + config.provider)
  } catch (error) {
    console.error('[sendMessage] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '메시지 발송 중 오류가 발생했습니다',
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
