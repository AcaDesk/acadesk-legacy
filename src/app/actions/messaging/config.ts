/**
 * Messaging Service Configuration Server Actions
 *
 * Tenant별 메시징 서비스 API 키 관리
 * - Aligo, Solapi, NHN Cloud 등 지원
 * - 각 원장님이 자신의 API 키를 등록하여 사용 (비용/책임 분리)
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Types
// ============================================================================

export type MessagingProvider = 'aligo' | 'solapi' | 'nhncloud'

interface MessagingConfig {
  id: string
  tenant_id: string
  provider: MessagingProvider
  aligo_user_id?: string | null
  aligo_api_key?: string | null
  aligo_sender_phone?: string | null
  solapi_api_key?: string | null
  solapi_api_secret?: string | null
  solapi_sender_phone?: string | null
  nhncloud_app_key?: string | null
  nhncloud_secret_key?: string | null
  nhncloud_sender_phone?: string | null
  is_active: boolean
  is_verified: boolean
  last_test_at?: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Validation Schemas
// ============================================================================

const aligoConfigSchema = z.object({
  provider: z.literal('aligo'),
  aligo_user_id: z.string().min(1, 'Aligo User ID는 필수입니다'),
  aligo_api_key: z.string().min(1, 'Aligo API Key는 필수입니다'),
  aligo_sender_phone: z.string().regex(/^010\d{8}$|^0[2-9]\d{7,8}$/, '올바른 전화번호 형식이 아닙니다 (예: 01012345678 또는 0212345678)'),
})

const solapiConfigSchema = z.object({
  provider: z.literal('solapi'),
  solapi_api_key: z.string().min(1, 'Solapi API Key는 필수입니다'),
  solapi_api_secret: z.string().min(1, 'Solapi API Secret은 필수입니다'),
  solapi_sender_phone: z.string().regex(/^010\d{8}$|^0[2-9]\d{7,8}$/, '올바른 전화번호 형식이 아닙니다'),
})

const nhncloudConfigSchema = z.object({
  provider: z.literal('nhncloud'),
  nhncloud_app_key: z.string().min(1, 'NHN Cloud App Key는 필수입니다'),
  nhncloud_secret_key: z.string().min(1, 'NHN Cloud Secret Key는 필수입니다'),
  nhncloud_sender_phone: z.string().regex(/^010\d{8}$|^0[2-9]\d{7,8}$/, '올바른 전화번호 형식이 아닙니다'),
})

const messagingConfigSchema = z.discriminatedUnion('provider', [
  aligoConfigSchema,
  solapiConfigSchema,
  nhncloudConfigSchema,
])

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get current tenant's messaging configuration
 */
export async function getMessagingConfig() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error

    return {
      success: true,
      data: data as MessagingConfig | null,
      error: null,
    }
  } catch (error) {
    console.error('[getMessagingConfig] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Save or update messaging configuration
 */
export async function saveMessagingConfig(
  input: z.infer<typeof messagingConfigSchema>
) {
  try {
    const { tenantId } = await verifyStaff()
    const validated = messagingConfigSchema.parse(input)
    const supabase = createServiceRoleClient()

    // Check if config already exists
    const { data: existing } = await supabase
      .from('tenant_messaging_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    let result

    if (existing) {
      // Update existing config
      const { data, error } = await supabase
        .from('tenant_messaging_config')
        .update({
          provider: validated.provider,
          ...(validated.provider === 'aligo' && {
            aligo_user_id: validated.aligo_user_id,
            aligo_api_key: validated.aligo_api_key,
            aligo_sender_phone: validated.aligo_sender_phone,
            // Clear other providers' data
            solapi_api_key: null,
            solapi_api_secret: null,
            solapi_sender_phone: null,
            nhncloud_app_key: null,
            nhncloud_secret_key: null,
            nhncloud_sender_phone: null,
          }),
          ...(validated.provider === 'solapi' && {
            solapi_api_key: validated.solapi_api_key,
            solapi_api_secret: validated.solapi_api_secret,
            solapi_sender_phone: validated.solapi_sender_phone,
            // Clear other providers' data
            aligo_user_id: null,
            aligo_api_key: null,
            aligo_sender_phone: null,
            nhncloud_app_key: null,
            nhncloud_secret_key: null,
            nhncloud_sender_phone: null,
          }),
          ...(validated.provider === 'nhncloud' && {
            nhncloud_app_key: validated.nhncloud_app_key,
            nhncloud_secret_key: validated.nhncloud_secret_key,
            nhncloud_sender_phone: validated.nhncloud_sender_phone,
            // Clear other providers' data
            aligo_user_id: null,
            aligo_api_key: null,
            aligo_sender_phone: null,
            solapi_api_key: null,
            solapi_api_secret: null,
            solapi_sender_phone: null,
          }),
          is_verified: false, // Reset verification when config changes
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new config
      const { data, error } = await supabase
        .from('tenant_messaging_config')
        .insert({
          tenant_id: tenantId,
          provider: validated.provider,
          ...(validated.provider === 'aligo' && {
            aligo_user_id: validated.aligo_user_id,
            aligo_api_key: validated.aligo_api_key,
            aligo_sender_phone: validated.aligo_sender_phone,
          }),
          ...(validated.provider === 'solapi' && {
            solapi_api_key: validated.solapi_api_key,
            solapi_api_secret: validated.solapi_api_secret,
            solapi_sender_phone: validated.solapi_sender_phone,
          }),
          ...(validated.provider === 'nhncloud' && {
            nhncloud_app_key: validated.nhncloud_app_key,
            nhncloud_secret_key: validated.nhncloud_secret_key,
            nhncloud_sender_phone: validated.nhncloud_sender_phone,
          }),
          is_active: false,
          is_verified: false,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: result as MessagingConfig,
      error: null,
    }
  } catch (error) {
    console.error('[saveMessagingConfig] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Send test message to verify configuration
 */
export async function sendTestMessage(phoneNumber: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get messaging config
    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) throw configError
    if (!config) {
      throw new Error('메시징 서비스 설정이 없습니다. 먼저 API 키를 등록해주세요.')
    }

    // Create provider instance based on configured provider
    const provider = createMessagingProvider(config)
    if (!provider) {
      throw new Error(`지원되지 않는 메시징 제공자: ${config.provider}`)
    }

    // Import MessageChannel enum
    const { MessageChannel } = await import('@/core/domain/messaging/IMessageProvider')

    // Send test message
    const testMessage = '[Acadesk] 메시징 서비스 테스트 메시지입니다. 정상적으로 연동되었습니다.'

    const result = await provider.send({
      channel: MessageChannel.SMS,
      recipient: {
        name: '테스트',
        phone: phoneNumber,
      },
      content: {
        body: testMessage,
      },
      metadata: {
        tenantId,
      },
    })

    // Check send result
    if (!result.success) {
      throw new Error(result.error || '메시지 발송 실패')
    }

    // Update verification status
    await supabase
      .from('tenant_messaging_config')
      .update({
        is_verified: true,
        last_test_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      message: `테스트 메시지가 성공적으로 발송되었습니다. (발송 ID: ${result.messageId})`,
      error: null,
    }
  } catch (error) {
    console.error('[sendTestMessage] Error:', error)
    return {
      success: false,
      message: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create messaging provider instance from config
 */
function createMessagingProvider(config: MessagingConfig) {
  switch (config.provider) {
    case 'aligo': {
      const { createAligoProvider } = require('@/infra/messaging/AligoProvider')
      return createAligoProvider({
        apiKey: config.aligo_api_key || '',
        userId: config.aligo_user_id || '',
        senderPhone: config.aligo_sender_phone || '',
      })
    }
    case 'solapi': {
      const { createSolapiProvider } = require('@/infra/messaging/SolapiProvider')
      return createSolapiProvider({
        apiKey: config.solapi_api_key || '',
        apiSecret: config.solapi_api_secret || '',
        senderPhone: config.solapi_sender_phone || '',
      })
    }
    case 'nhncloud': {
      // TODO: Implement NHN Cloud provider
      console.warn('[createMessagingProvider] NHN Cloud provider not implemented yet')
      return null
    }
    default:
      return null
  }
}

/**
 * Toggle messaging service active status
 */
export async function toggleMessagingActive(isActive: boolean) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get current config
    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('id, is_verified')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) throw configError
    if (!config) {
      throw new Error('메시징 서비스 설정이 없습니다.')
    }

    // Can't activate without verification
    if (isActive && !config.is_verified) {
      throw new Error('먼저 테스트 메시지를 발송하여 설정을 인증해주세요.')
    }

    const { error } = await supabase
      .from('tenant_messaging_config')
      .update({ is_active: isActive })
      .eq('id', config.id)

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      message: isActive ? '메시징 서비스가 활성화되었습니다.' : '메시징 서비스가 비활성화되었습니다.',
      error: null,
    }
  } catch (error) {
    console.error('[toggleMessagingActive] Error:', error)
    return {
      success: false,
      message: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete messaging configuration
 */
export async function deleteMessagingConfig() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('tenant_messaging_config')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteMessagingConfig] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get messaging service balance (Solapi only for now)
 * 연동된 메시징 서비스 계정의 잔액을 조회합니다.
 */
export async function getMessagingBalance() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get messaging config
    const { data: config, error: configError } = await supabase
      .from('tenant_messaging_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (configError) throw configError
    if (!config) {
      return {
        success: false,
        data: null,
        error: '메시징 서비스 설정이 없습니다.',
      }
    }

    if (!config.is_active || !config.is_verified) {
      return {
        success: false,
        data: null,
        error: '메시징 서비스가 활성화되지 않았습니다.',
      }
    }

    // Currently only Solapi supports balance check
    if (config.provider !== 'solapi') {
      return {
        success: false,
        data: null,
        error: `${config.provider} 제공자는 잔액 조회를 지원하지 않습니다.`,
      }
    }

    // Create Solapi provider and check balance
    const { SolapiProvider } = await import('@/infra/messaging/SolapiProvider')
    const provider = new SolapiProvider({
      apiKey: config.solapi_api_key || '',
      apiSecret: config.solapi_api_secret || '',
      senderPhone: config.solapi_sender_phone || '',
    })

    const balanceData = await provider.checkBalance()

    return {
      success: true,
      data: {
        balance: balanceData.balance,
        currency: balanceData.currency,
        provider: config.provider,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getMessagingBalance] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
