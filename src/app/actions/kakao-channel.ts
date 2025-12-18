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
import { SolapiProvider } from '@/infra/messaging/SolapiProvider'
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
  searchId: z.string().min(1, '채널 검색 ID는 필수입니다').regex(/^@/, '검색 ID는 @로 시작해야 합니다'),
  phoneNumber: z.string().regex(/^010\d{8}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 01012345678)'),
})

const createChannelSchema = z.object({
  searchId: z.string().min(1),
  phoneNumber: z.string().min(1),
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

/**
 * Get SolapiProvider instance with tenant config
 */
async function getSolapiProvider(tenantId: string): Promise<SolapiProvider | null> {
  const supabase = createServiceRoleClient()

  const { data: config, error } = await supabase
    .from('tenant_messaging_config')
    .select('provider, solapi_api_key, solapi_api_secret, solapi_sender_phone')
    .eq('tenant_id', tenantId)
    .eq('provider', 'solapi')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !config) {
    console.error('[getSolapiProvider] Config not found or error:', error)
    return null
  }

  if (!config.solapi_api_key || !config.solapi_api_secret) {
    console.error('[getSolapiProvider] Missing Solapi credentials')
    return null
  }

  return new SolapiProvider({
    apiKey: config.solapi_api_key,
    apiSecret: config.solapi_api_secret,
    senderPhone: config.solapi_sender_phone || '',
  })
}

// ============================================================================
// Server Actions - Channel Status
// ============================================================================

/**
 * Get Kakao channel configuration for current tenant
 */
export async function getKakaoChannelConfig(): Promise<{
  success: boolean
  data: KakaoChannelConfig | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('tenant_messaging_config')
      .select(`
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

    const result = await provider.requestKakaoChannelToken({
      searchId: validated.searchId,
      phoneNumber: validated.phoneNumber,
    })

    if (!result.success) {
      throw new Error(result.error || '채널 토큰 요청 실패')
    }

    return {
      success: true,
      error: null,
    }
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

    // Create channel via Solapi API
    const channel = await provider.createKakaoChannel({
      searchId: validated.searchId,
      phoneNumber: validated.phoneNumber,
      token: validated.token,
      categoryCode: validated.categoryCode,
    })

    // Save channel info to tenant_messaging_config
    const supabase = createServiceRoleClient()

    const { error: updateError } = await supabase
      .from('tenant_messaging_config')
      .update({
        kakao_channel_id: channel.channelId,
        kakao_channel_search_id: channel.searchId,
        kakao_channel_name: channel.name,
        kakao_channel_status: channel.status,
        kakao_channel_verified_at: channel.verifiedAt?.toISOString() || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (updateError) throw updateError

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

    // Remove channel from Solapi
    const provider = await getSolapiProvider(tenantId)
    if (provider) {
      try {
        await provider.removeKakaoChannel(config.kakao_channel_id)
      } catch (solapiError) {
        console.warn('[removeKakaoChannel] Solapi API error (continuing):', solapiError)
        // Continue even if Solapi API fails - we still want to clear our DB
      }
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
