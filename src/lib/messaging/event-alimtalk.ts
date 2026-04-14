/**
 * 이벤트 기반 알림톡 발송 엔진
 *
 * 이벤트 구독 상태를 확인하고, 승인된 템플릿으로 알림톡을 발송합니다.
 * - verifyStaff() 불필요 (키오스크 등 비인증 컨텍스트에서도 동작)
 * - tenantId를 직접 받음
 * - 이벤트 구독 활성화 + 승인 상태 확인 내장
 * - notification_logs에 event_type 기록
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { SolapiProvider } from '@/infra/messaging/SolapiProvider'
import { getGuardianPhones } from './guardian-lookup'

// ============================================================================
// Types
// ============================================================================

export interface SendEventAlimtalkParams {
  tenantId: string
  eventType: string
  recipientPhone: string
  variables: Record<string, string>
  studentId?: string
}

export interface SendEventAlimtalkResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// Core: 개별 발송
// ============================================================================

/**
 * 이벤트 알림톡 개별 발송
 *
 * 1. tenant_event_subscriptions에서 이벤트 구독 확인 (enabled + approved)
 * 2. kakao_alimtalk_templates에서 솔라피 template ID 조회
 * 3. tenant_messaging_config에서 솔라피 자격증명 + 채널 ID 조회
 * 4. SolapiProvider.sendAlimtalk() 호출
 * 5. notification_logs 기록
 */
export async function sendEventAlimtalk(
  params: SendEventAlimtalkParams
): Promise<SendEventAlimtalkResult> {
  const { tenantId, eventType, recipientPhone, variables, studentId } = params
  const supabase = createServiceRoleClient()

  try {
    // 1. 이벤트 구독 확인
    const { data: sub, error: subError } = await supabase
      .from('tenant_event_subscriptions')
      .select('kakao_template_id, is_enabled, provisioning_status')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .maybeSingle()

    if (subError) throw subError

    if (!sub || !sub.is_enabled || sub.provisioning_status !== 'approved' || !sub.kakao_template_id) {
      return { success: false, error: '이벤트가 비활성화되었거나 템플릿이 승인되지 않았습니다.' }
    }

    // 2. kakao_alimtalk_templates에서 솔라피 template ID
    const { data: tpl, error: tplError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('solapi_template_id')
      .eq('id', sub.kakao_template_id)
      .is('deleted_at', null)
      .single()

    if (tplError || !tpl) {
      return { success: false, error: '템플릿 정보를 찾을 수 없습니다.' }
    }

    // 3. 솔라피 자격증명 + 채널 ID
    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select(
        'solapi_api_key, solapi_api_secret, solapi_sender_phone, kakao_channel_id, kakao_sms_fallback_enabled'
      )
      .eq('tenant_id', tenantId)
      .eq('provider', 'solapi')
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError || !config || !config.solapi_api_key || !config.kakao_channel_id) {
      return { success: false, error: '솔라피 설정이 올바르지 않습니다.' }
    }

    // 4. 발송
    const provider = new SolapiProvider({
      apiKey: config.solapi_api_key,
      apiSecret: config.solapi_api_secret,
      senderPhone: config.solapi_sender_phone || '',
    })

    const result = await provider.sendAlimtalk({
      to: recipientPhone,
      channelId: config.kakao_channel_id,
      templateId: tpl.solapi_template_id,
      variables,
      disableSms: config.kakao_sms_fallback_enabled === false,
    })

    // 5. notification_logs 기록
    await supabase.from('notification_logs').insert({
      tenant_id: tenantId,
      student_id: studentId || null,
      notification_type: 'kakao',
      status: result.success ? 'sent' : 'failed',
      message: `[${eventType}] 알림톡 발송`,
      sent_at: new Date().toISOString(),
      kakao_template_id: sub.kakao_template_id,
      event_type: eventType,
    })

    if (!result.success) {
      return { success: false, error: result.error || '알림톡 발송 실패' }
    }

    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error(`[sendEventAlimtalk] ${eventType} Error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알림톡 발송 중 오류',
    }
  }
}

// ============================================================================
// Fire-and-forget 래퍼: 학생 → 보호자 조회 → 발송
// ============================================================================

/**
 * 이벤트 알림톡 fire-and-forget 발송
 *
 * 학생 ID로 보호자를 조회하고, 각 보호자에게 알림톡을 발송합니다.
 * 절대 throw하지 않으며, 실패 시 콘솔 로그만 남깁니다.
 */
export async function fireEventAlimtalk(
  tenantId: string,
  eventType: string,
  studentId: string,
  extraVariables?: Record<string, string>
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()

    // 빠른 구독 확인 (비용 절약 — 비활성이면 보호자 조회 스킵)
    const { data: sub } = await supabase
      .from('tenant_event_subscriptions')
      .select('is_enabled, provisioning_status')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .maybeSingle()

    if (!sub?.is_enabled || sub.provisioning_status !== 'approved') {
      return
    }

    // 보호자 조회
    const guardians = await getGuardianPhones(supabase, studentId, tenantId)
    if (guardians.length === 0) return

    // 학생 이름 + 학원 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('name, students_pii(name)')
      .eq('id', studentId)
      .maybeSingle()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, phone')
      .eq('id', tenantId)
      .maybeSingle()

    const piiData = student?.students_pii as
      | Array<{ name?: string }>
      | { name?: string }
      | null
    const piiName = Array.isArray(piiData) ? piiData[0]?.name : piiData?.name
    const studentName = piiName || student?.name || '학생'
    const academyName = tenant?.name || '학원'
    const academyPhone = tenant?.phone || ''

    // 각 보호자에게 발송
    for (const guardian of guardians) {
      const variables: Record<string, string> = {
        학원명: academyName,
        학원연락처: academyPhone,
        보호자명: guardian.name,
        학생명: studentName,
        ...extraVariables,
      }

      await sendEventAlimtalk({
        tenantId,
        eventType,
        recipientPhone: guardian.phone,
        variables,
        studentId,
      })
    }
  } catch (error) {
    // fire-and-forget — 절대 throw하지 않음
    console.error(`[fireEventAlimtalk] ${eventType} Error (silent):`, error)
  }
}
