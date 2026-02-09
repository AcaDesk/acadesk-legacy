/**
 * Kakao Alimtalk Channel Server Actions
 *
 * 카카오 비즈니스 채널 연동 및 관리
 * - 채널 토큰 요청, 채널 연동, 채널 삭제
 * - SMS Fallback 설정
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { getSolapiProvider } from '@/lib/messaging/get-solapi-provider'
import type { KakaoChannel, KakaoChannelCategory } from '@/infra/messaging/types/kakao.types'

// ============================================================================
// Types
// ============================================================================

export interface KakaoChannelConfig {
  channelId: string | null
  searchId: string | null
  channelName: string | null
  channelStatus: 'pending' | 'active' | 'suspended' | null
  smsFallbackEnabled: boolean
  manualFallbackEnabled: boolean
  verifiedAt: string | null
}

// ============================================================================
// Validation Schemas
// ============================================================================

const requestTokenSchema = z.object({
  searchId: z.string().trim().min(1, '채널 검색 ID는 필수입니다'),
  phoneNumber: z.string().regex(/^010\d{8}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 01012345678)'),
})

const createChannelSchema = z.object({
  searchId: z.string().trim().min(1, '채널 검색 ID는 필수입니다'),
  phoneNumber: z.string().regex(/^010\d{8}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 01012345678)'),
  token: z.string().min(1, '인증 토큰은 필수입니다'),
  categoryCode: z.string().min(1, '카테고리 선택은 필수입니다'),
})

const fallbackSettingsSchema = z.object({
  smsFallbackEnabled: z.boolean(),
  manualFallbackEnabled: z.boolean(),
})

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeSearchIdWithAt(searchId: string): string {
  const trimmed = searchId.trim()
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

function parseAndValidateSearchId(searchId: string): { withAt: string; withoutAt: string } {
  const compact = searchId
    .trim()
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '')

  if (!compact) {
    throw new Error('채널 검색 ID를 입력해주세요.')
  }

  if (compact.includes('pf.kakao.com')) {
    throw new Error(
      '채널 URL이 아닌 "검색용 아이디"를 입력해야 합니다. 예: @acadesk'
    )
  }

  const withAt = normalizeSearchIdWithAt(compact)
  const withoutAt = withAt.replace(/^@/, '')

  if (withoutAt.startsWith('_')) {
    throw new Error(
      '입력값은 채널 URL 식별자(_...)로 보입니다. 관리자센터의 "검색용 아이디"(@...)를 입력해주세요.'
    )
  }

  // 카카오 채널 가이드: 15자 이내 한글/영문 소문자/숫자
  if (!/^[가-힣a-z0-9]{1,15}$/.test(withoutAt)) {
    throw new Error(
      '검색용 아이디 형식이 올바르지 않습니다. 15자 이내 한글/영문 소문자/숫자만 사용할 수 있습니다.'
    )
  }

  return { withAt, withoutAt }
}

function getSearchIdCandidates(searchId: string): { withAt: string; candidates: string[] } {
  const parsed = parseAndValidateSearchId(searchId)
  return {
    withAt: parsed.withAt,
    candidates: [...new Set([parsed.withAt, parsed.withoutAt])],
  }
}

function isSearchIdAlreadyInUseError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('searchidinuse') ||
    normalized.includes('already') ||
    normalized.includes('channelalreadyregistered') ||
    message.includes('이미 등록')
  )
}

// ============================================================================
// Server Actions - Channel Status
// ============================================================================

/**
 * Get Kakao channel configuration for current tenant
 * Returns channel config along with provider/verification status for UI validation
 */
export async function getKakaoChannelConfig(): Promise<{
  success: boolean
  data: (KakaoChannelConfig & {
    /** Whether the messaging provider is Solapi (only Solapi supports Kakao) */
    isSolapiProvider: boolean
    /** Whether the messaging config is verified */
    isProviderVerified: boolean
    /** Whether Kakao is fully usable (Solapi + verified + channel configured) */
    isKakaoUsable: boolean
  }) | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('tenant_messaging_config')
      .select(`
        provider,
        is_verified,
        kakao_channel_id,
        kakao_channel_search_id,
        kakao_channel_name,
        kakao_channel_status,
        kakao_sms_fallback_enabled,
        kakao_manual_fallback_enabled,
        kakao_channel_verified_at
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return {
        success: true,
        data: null,
        error: null,
      }
    }

    const isSolapiProvider = data.provider === 'solapi'
    const isProviderVerified = data.is_verified === true
    const hasKakaoChannel = !!data.kakao_channel_id
    const isKakaoUsable = isSolapiProvider && isProviderVerified && hasKakaoChannel

    return {
      success: true,
      data: {
        channelId: data.kakao_channel_id,
        searchId: data.kakao_channel_search_id,
        channelName: data.kakao_channel_name,
        channelStatus: data.kakao_channel_status,
        smsFallbackEnabled: data.kakao_sms_fallback_enabled ?? true,
        manualFallbackEnabled: data.kakao_manual_fallback_enabled ?? false,
        verifiedAt: data.kakao_channel_verified_at,
        isSolapiProvider,
        isProviderVerified,
        isKakaoUsable,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoChannelConfig] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - Channel Registration
// ============================================================================

/**
 * Get Kakao channel categories
 */
export async function getKakaoChannelCategories(): Promise<{
  success: boolean
  data: KakaoChannelCategory[] | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const provider = await getSolapiProvider(tenantId)

    if (!provider) {
      throw new Error('먼저 Solapi API 설정을 완료해주세요.')
    }

    const categories = await provider.getKakaoChannelCategories()

    return {
      success: true,
      data: categories,
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoChannelCategories] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Request Kakao channel authentication token
 * This will send a verification message to the provided phone number via KakaoTalk
 */
export async function requestKakaoChannelToken(
  input: z.infer<typeof requestTokenSchema>
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const validated = requestTokenSchema.parse(input)
    const provider = await getSolapiProvider(tenantId)

    if (!provider) {
      throw new Error('먼저 Solapi API 설정을 완료해주세요.')
    }

    const { candidates } = getSearchIdCandidates(validated.searchId)
    let lastError: string | null = null

    for (const candidateSearchId of candidates) {
      const result = await provider.requestKakaoChannelToken({
        searchId: candidateSearchId,
        phoneNumber: validated.phoneNumber,
      })

      if (result.success) {
        return {
          success: true,
          error: null,
        }
      }

      console.warn('[requestKakaoChannelToken] Candidate failed:', {
        candidateSearchId,
        error: result.error,
      })
      lastError = result.error || '채널 토큰 요청 실패'
    }

    throw new Error(lastError || '채널 토큰 요청 실패')
  } catch (error) {
    console.error('[requestKakaoChannelToken] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create (register) Kakao channel
 * Must be called after receiving the verification token via KakaoTalk
 */
export async function createKakaoChannel(
  input: z.infer<typeof createChannelSchema>
): Promise<{
  success: boolean
  data: KakaoChannel | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const validated = createChannelSchema.parse(input)
    const provider = await getSolapiProvider(tenantId)

    if (!provider) {
      throw new Error('먼저 Solapi API 설정을 완료해주세요.')
    }

    // Create channel via Solapi API (searchId @포함/미포함 모두 시도)
    const { withAt: canonicalSearchId, candidates } = getSearchIdCandidates(validated.searchId)
    let channel: KakaoChannel | null = null
    let lastError: unknown = null

    for (const candidateSearchId of candidates) {
      try {
        channel = await provider.createKakaoChannel({
          searchId: candidateSearchId,
          phoneNumber: validated.phoneNumber,
          token: validated.token,
          categoryCode: validated.categoryCode,
        })
        break
      } catch (error) {
        console.warn('[createKakaoChannel] Candidate failed:', {
          candidateSearchId,
          error: getErrorMessage(error),
        })
        lastError = error
      }
    }

    // "이미 등록된 채널" 에러 시 기존 채널을 조회하여 복구
    if (!channel && lastError) {
      const errorMessage = getErrorMessage(lastError)
      if (isSearchIdAlreadyInUseError(errorMessage)) {
        try {
          const existingChannels = await provider.getKakaoChannels()
          const existing = existingChannels.find((ch) =>
            candidates.some((c) => ch.searchId === c || ch.searchId === `@${c}` || `@${ch.searchId}` === c)
          )
          if (existing) {
            console.info('[createKakaoChannel] Recovered already-registered channel:', existing.channelId)
            channel = existing
          } else {
            throw new Error(
              '사용 중인 검색용 아이디입니다. 이미 다른 Solapi 계정에 연결된 채널인지 확인해주세요.'
            )
          }
        } catch (recoveryError) {
          console.error('[createKakaoChannel] Recovery lookup failed:', recoveryError)
          if (recoveryError instanceof Error) {
            throw recoveryError
          }
          throw new Error(
            '사용 중인 검색용 아이디입니다. 이미 다른 Solapi 계정에 연결된 채널인지 확인해주세요.'
          )
        }
      }
    }

    if (!channel) {
      throw lastError || new Error('채널 연동 실패')
    }

    // Save channel info to tenant_messaging_config
    const supabase = createServiceRoleClient()

    const { error: updateError } = await supabase
      .from('tenant_messaging_config')
      .update({
        kakao_channel_id: channel.channelId,
        kakao_channel_search_id: canonicalSearchId,
        kakao_channel_name: channel.name,
        kakao_channel_status: channel.status,
        kakao_channel_verified_at: channel.verifiedAt?.toISOString() || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (updateError) {
      console.error('[createKakaoChannel] DB update failed, but Solapi channel created:', updateError)
      return {
        success: false,
        data: channel,
        error: '채널은 생성되었으나 설정 저장에 실패했습니다. 페이지를 새로고침하여 다시 시도해주세요.',
      }
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: channel,
      error: null,
    }
  } catch (error) {
    console.error('[createKakaoChannel] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Remove Kakao channel
 * Warning: This will also delete all templates associated with the channel
 */
export async function removeKakaoChannel(): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get current channel info
    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('kakao_channel_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) throw configError
    if (!config?.kakao_channel_id) {
      throw new Error('연동된 카카오 채널이 없습니다.')
    }

    // Remove channel from Solapi (must succeed before clearing DB)
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error(
        'Solapi API 설정이 없어 원격 채널을 삭제할 수 없습니다. ' +
          '설정 페이지에서 Solapi 연동을 먼저 확인해주세요.'
      )
    }

    try {
      await provider.removeKakaoChannel(config.kakao_channel_id)
    } catch (solapiError) {
      console.error('[removeKakaoChannel] Solapi API error:', solapiError)
      throw new Error(
        'Solapi에서 채널 삭제에 실패했습니다. 잠시 후 다시 시도하거나 Solapi 대시보드에서 직접 삭제해주세요.'
      )
    }

    // Clear channel info from tenant_messaging_config
    const { error: updateError } = await supabase
      .from('tenant_messaging_config')
      .update({
        kakao_channel_id: null,
        kakao_channel_search_id: null,
        kakao_channel_name: null,
        kakao_channel_status: null,
        kakao_channel_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (updateError) throw updateError

    // Soft delete all templates for this tenant
    const { error: templatesError } = await supabase
      .from('kakao_alimtalk_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (templatesError) {
      console.warn('[removeKakaoChannel] Template cleanup error:', templatesError)
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[removeKakaoChannel] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - Fallback Settings
// ============================================================================

/**
 * Update SMS fallback settings
 */
export async function updateKakaoFallbackSettings(
  input: z.infer<typeof fallbackSettingsSchema>
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const validated = fallbackSettingsSchema.parse(input)
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('tenant_messaging_config')
      .update({
        kakao_sms_fallback_enabled: validated.smsFallbackEnabled,
        kakao_manual_fallback_enabled: validated.manualFallbackEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateKakaoFallbackSettings] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
