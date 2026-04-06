/**
 * Event Subscription Server Actions
 *
 * 학원별 이벤트 알림톡 ���독 관리
 * - 이벤트 구독 조회/토글
 * - 공용 템플릿 → 학원 솔라피 계정 자동 프로비저닝
 * - 카카오 검수 상태 폴링
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { ValidationError } from '@/lib/error-types'
import { getSolapiProvider } from '@/lib/messaging/get-solapi-provider'
import { translateSolapiError } from '@/lib/solapi-error-translator'

// ============================================================================
// Types
// ============================================================================

export type ProvisioningStatus =
  | 'not_started'
  | 'provisioning'
  | 'inspecting'
  | 'approved'
  | 'rejected'
  | 'failed'

export interface EventSubscription {
  id: string
  tenantId: string
  eventType: string
  isEnabled: boolean
  provisioningStatus: ProvisioningStatus
  kakaoTemplateId: string | null
  rejectionReason: string | null
  lastProvisionedAt: string | null
  sharedTemplate: {
    id: string
    name: string
    description: string | null
    content: string
    variables: string[]
    version: number
  }
}

// ============================================================================
// Server Actions - 조회
// ============================================================================

/**
 * 현재 학원의 이벤트 구독 목록 조회 (공용 템플릿 JOIN)
 *
 * 아직 구독 레코드가 없는 공용 템플릿도 포함하여 반환
 */
export async function getEventSubscriptions(): Promise<{
  success: boolean
  data: EventSubscription[]
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 활성 공용 템플릿 전체 조회
    const { data: sharedTemplates, error: sharedError } = await supabase
      .from('shared_alimtalk_templates')
      .select('id, event_type, name, description, content, variables, version')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (sharedError) throw sharedError

    // 2. 학원의 기존 구독 레코드 조회
    const { data: subscriptions, error: subError } = await supabase
      .from('tenant_event_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)

    if (subError) throw subError

    // 3. 공용 템플릿 기준으로 병합 (구독 없으면 기본값)
    const subMap = new Map(
      (subscriptions || []).map((s) => [s.event_type, s])
    )

    const result: EventSubscription[] = (sharedTemplates || []).map((tpl) => {
      const sub = subMap.get(tpl.event_type)
      return {
        id: sub?.id ?? '',
        tenantId,
        eventType: tpl.event_type,
        isEnabled: sub?.is_enabled ?? false,
        provisioningStatus: (sub?.provisioning_status ?? 'not_started') as ProvisioningStatus,
        kakaoTemplateId: sub?.kakao_template_id ?? null,
        rejectionReason: sub?.rejection_reason ?? null,
        lastProvisionedAt: sub?.last_provisioned_at ?? null,
        sharedTemplate: {
          id: tpl.id,
          name: tpl.name,
          description: tpl.description,
          content: tpl.content,
          variables: tpl.variables as string[],
          version: tpl.version,
        },
      }
    })

    return {
      success: true,
      data: result,
      error: null,
    }
  } catch (error) {
    console.error('[getEventSubscriptions] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - 이벤트 토글
// ============================================================================

/**
 * 이벤트 구독 활성화/비활성화
 *
 * 활성화 시 provisioning_status가 'approved'여야 함
 */
export async function toggleEventSubscription(
  eventType: string,
  enabled: boolean
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 구독 레코드 조회
    const { data: sub, error: subError } = await supabase
      .from('tenant_event_subscriptions')
      .select('id, provisioning_status')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .maybeSingle()

    if (subError) throw subError

    if (!sub) {
      throw new ValidationError('먼저 템플릿을 등록해주세요.')
    }

    // 활성화 시 승인 상태 확인
    if (enabled && sub.provisioning_status !== 'approved') {
      throw new ValidationError('카카오 검수가 완료된 템플릿만 활성화할 수 ��습니다.')
    }

    const { error: updateError } = await supabase
      .from('tenant_event_subscriptions')
      .update({ is_enabled: enabled })
      .eq('id', sub.id)

    if (updateError) throw updateError

    revalidatePath('/settings/messaging-integration')

    return { success: true, error: null }
  } catch (error) {
    console.error('[toggleEventSubscription] Error:', error)
    return {
      success: false,
      error: error instanceof ValidationError ? error.message : getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - 템플릿 프로���저닝
// ============================================================================

/**
 * 공용 템플릿을 학원의 솔라피 계정에 자동 등록
 *
 * 1. 공용 템플릿 내용 가져오기
 * 2. 학원 솔라피 Provider로 createKakaoAlimtalkTemplate() 호출
 * 3. kakao_alimtalk_templates에 INSERT
 * 4. tenant_event_subscriptions UPSERT (provisioning_status = 'inspecting')
 */
export async function provisionTemplate(eventType: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 공용 템플릿 조회
    const { data: shared, error: sharedError } = await supabase
      .from('shared_alimtalk_templates')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .single()

    if (sharedError || !shared) {
      throw new ValidationError('해당 이벤트의 공용 템플릿을 찾을 수 없습니다.')
    }

    // 2. 학원 솔라피 Provider + 채널 ID 조회
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new ValidationError('먼저 Solapi API 설정을 완료해주���요.')
    }

    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('kakao_channel_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) throw configError
    if (!config?.kakao_channel_id) {
      throw new ValidationError('먼저 카카오 채널을 연동해주세요.')
    }

    // 3. 구독 레코드 UPSERT (provisioning 상태로)
    const { data: existingSub } = await supabase
      .from('tenant_event_subscriptions')
      .select('id, kakao_template_id')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .maybeSingle()

    // 기존 프로비저닝된 템플릿이 있으면 soft delete
    if (existingSub?.kakao_template_id) {
      await supabase
        .from('kakao_alimtalk_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existingSub.kakao_template_id)
    }

    const subUpsertData = {
      tenant_id: tenantId,
      shared_template_id: shared.id,
      event_type: eventType,
      provisioning_status: 'provisioning' as const,
      rejection_reason: null,
      kakao_template_id: null,
      last_provisioned_at: new Date().toISOString(),
    }

    let subId: string
    if (existingSub) {
      await supabase
        .from('tenant_event_subscriptions')
        .update(subUpsertData)
        .eq('id', existingSub.id)
      subId = existingSub.id
    } else {
      const { data: newSub, error: insertError } = await supabase
        .from('tenant_event_subscriptions')
        .insert(subUpsertData)
        .select('id')
        .single()
      if (insertError) throw insertError
      subId = newSub.id
    }

    // 4. 솔라피에 템플릿 등록
    let solapiResult: { solapiTemplateId: string; status: string }
    try {
      solapiResult = await provider.createKakaoAlimtalkTemplate({
        channelId: config.kakao_channel_id,
        name: shared.name,
        content: shared.content,
        categoryCode: shared.category_code,
        messageType: shared.message_type || 'BA',
        emphasizeType: shared.emphasize_type || 'NONE',
        emphasizeTitle: shared.emphasize_title,
        emphasizeSubtitle: shared.emphasize_subtitle,
        buttons: shared.buttons || [],
        securityFlag: shared.security_flag || false,
      })
    } catch (solapiError) {
      // 솔라피 등록 실패 → 구독 상태를 failed로 업데이트
      await supabase
        .from('tenant_event_subscriptions')
        .update({
          provisioning_status: 'failed',
          rejection_reason: translateSolapiError(solapiError),
        })
        .eq('id', subId)

      console.error('[provisionTemplate] Solapi error:', solapiError)
      throw new ValidationError(translateSolapiError(solapiError))
    }

    // 5. kakao_alimtalk_templates에 INSERT
    const { data: kakaoTemplate, error: kakaoError } = await supabase
      .from('kakao_alimtalk_templates')
      .insert({
        tenant_id: tenantId,
        solapi_template_id: solapiResult.solapiTemplateId,
        channel_id: config.kakao_channel_id,
        name: shared.name,
        content: shared.content,
        category_code: shared.category_code,
        message_type: shared.message_type || 'BA',
        emphasize_type: shared.emphasize_type || 'NONE',
        emphasize_title: shared.emphasize_title,
        emphasize_subtitle: shared.emphasize_subtitle,
        buttons: shared.buttons || [],
        security_flag: shared.security_flag || false,
        status: solapiResult.status || 'pending',
        shared_template_id: shared.id,
        shared_template_version: shared.version,
      })
      .select('id')
      .single()

    if (kakaoError) throw kakaoError

    // 6. 구독 레코드에 kakao_template_id 연결 + 상태 업데이트
    const { error: linkError } = await supabase
      .from('tenant_event_subscriptions')
      .update({
        kakao_template_id: kakaoTemplate.id,
        provisioning_status: solapiResult.status === 'approved' ? 'approved' : 'inspecting',
      })
      .eq('id', subId)

    if (linkError) throw linkError

    revalidatePath('/settings/messaging-integration')

    return { success: true, error: null }
  } catch (error) {
    console.error('[provisionTemplate] Error:', error)
    return {
      success: false,
      error: error instanceof ValidationError ? error.message : getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - 검수 상태 새로고침
// ============================================================================

/**
 * 솔라피에서 템플릿 검수 상태 폴링
 */
export async function refreshSubscriptionStatus(eventType: string): Promise<{
  success: boolean
  data: { status: ProvisioningStatus; rejectionReason: string | null } | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 구독 + 연결된 kakao 템플릿 조회
    const { data: sub, error: subError } = await supabase
      .from('tenant_event_subscriptions')
      .select('id, kakao_template_id')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .maybeSingle()

    if (subError) throw subError
    if (!sub?.kakao_template_id) {
      throw new ValidationError('등록된 템플릿이 없습니다.')
    }

    // kakao_alimtalk_templates에서 solapi_template_id 가져오기
    const { data: kakaoTpl, error: tplError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('solapi_template_id, status')
      .eq('id', sub.kakao_template_id)
      .single()

    if (tplError || !kakaoTpl) {
      throw new ValidationError('템플릿 정보를 찾을 수 없습니다.')
    }

    // 솔라피에서 최신 상태 조회
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new ValidationError('Solapi 설정을 찾을 수 없습니���.')
    }

    const solapiTemplate = await provider.getKakaoAlimtalkTemplate(
      kakaoTpl.solapi_template_id
    )

    // 상태 매핑
    const statusMap: Record<string, ProvisioningStatus> = {
      pending: 'inspecting',
      inspecting: 'inspecting',
      approved: 'approved',
      rejected: 'rejected',
      suspended: 'failed',
    }
    const newStatus = statusMap[solapiTemplate.status] || 'inspecting'
    const rejectionReason = solapiTemplate.rejectionReason || null

    // kakao_alimtalk_templates 상태 업데이트
    await supabase
      .from('kakao_alimtalk_templates')
      .update({
        status: solapiTemplate.status,
        rejection_reason: rejectionReason,
        ...(solapiTemplate.status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
      })
      .eq('id', sub.kakao_template_id)

    // 구독 상태 업데이트
    await supabase
      .from('tenant_event_subscriptions')
      .update({
        provisioning_status: newStatus,
        rejection_reason: rejectionReason,
      })
      .eq('id', sub.id)

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: { status: newStatus, rejectionReason },
      error: null,
    }
  } catch (error) {
    console.error('[refreshSubscriptionStatus] Error:', error)
    return {
      success: false,
      data: null,
      error: error instanceof ValidationError ? error.message : getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - 재등록
// ============================================================================

/**
 * 반려/실패된 템플릿 재등록
 * 기존 템플릿을 soft delete 후 새로 프로비저닝
 */
export async function retryProvision(eventType: string): Promise<{
  success: boolean
  error: string | null
}> {
  return provisionTemplate(eventType)
}
