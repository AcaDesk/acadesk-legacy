/**
 * Kakao Alimtalk Template Server Actions
 *
 * 카카오 알림톡 템플릿 관리
 * - 템플릿 생성, 조회, 수정, 삭제
 * - 솔라피 API와 로컬 DB 동기화
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { SolapiProvider } from '@/infra/messaging/SolapiProvider'
import type {
  KakaoTemplateCategory,
  KakaoTemplateStatus,
  KakaoMessageType,
  KakaoEmphasizeType,
  KakaoButton,
} from '@/infra/messaging/types/kakao.types'

// ============================================================================
// Types
// ============================================================================

export interface KakaoTemplate {
  id: string
  tenantId: string
  solapiTemplateId: string
  kakaoTemplateCode: string | null
  channelId: string
  name: string
  content: string
  categoryCode: string
  messageType: KakaoMessageType
  emphasizeType: KakaoEmphasizeType
  emphasizeTitle: string | null
  emphasizeSubtitle: string | null
  buttons: KakaoButton[]
  status: KakaoTemplateStatus
  rejectionReason: string | null
  securityFlag: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Validation Schemas
// ============================================================================

const kakaoButtonSchema = z.object({
  buttonType: z.enum(['WL', 'AL', 'BK', 'MD', 'DS', 'BC', 'BT', 'AC']),
  buttonName: z.string().min(1).max(14),
  linkMo: z.string().optional(),
  linkPc: z.string().optional(),
  linkAnd: z.string().optional(),
  linkIos: z.string().optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름은 필수입니다').max(150),
  content: z.string().min(1, '템플릿 내용은 필수입니다').max(1000),
  categoryCode: z.string().min(1, '카테고리 선택은 필수입니다'),
  messageType: z.enum(['BA', 'EX', 'AD', 'MI']).default('BA'),
  emphasizeType: z.enum(['NONE', 'TEXT', 'IMAGE', 'ITEM_LIST']).default('NONE'),
  emphasizeTitle: z.string().max(23).optional(),
  emphasizeSubtitle: z.string().max(23).optional(),
  buttons: z.array(kakaoButtonSchema).max(5).optional(),
  extraContent: z.string().max(500).optional(),
  adContent: z.string().max(500).optional(),
  securityFlag: z.boolean().default(false),
})

const updateTemplateSchema = createTemplateSchema.partial()

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
    return null
  }

  if (!config.solapi_api_key || !config.solapi_api_secret) {
    return null
  }

  return new SolapiProvider({
    apiKey: config.solapi_api_key,
    apiSecret: config.solapi_api_secret,
    senderPhone: config.solapi_sender_phone || '',
  })
}

/**
 * Get tenant's Kakao channel ID
 */
async function getTenantChannelId(tenantId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('tenant_messaging_config')
    .select('kakao_channel_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data.kakao_channel_id
}

/**
 * Map DB row to KakaoTemplate type
 */
function mapDbToTemplate(row: any): KakaoTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    solapiTemplateId: row.solapi_template_id,
    kakaoTemplateCode: row.kakao_template_code,
    channelId: row.channel_id,
    name: row.name,
    content: row.content,
    categoryCode: row.category_code,
    messageType: row.message_type,
    emphasizeType: row.emphasize_type,
    emphasizeTitle: row.emphasize_title,
    emphasizeSubtitle: row.emphasize_subtitle,
    buttons: row.buttons || [],
    status: row.status,
    rejectionReason: row.rejection_reason,
    securityFlag: row.security_flag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// Server Actions - Template Categories
// ============================================================================

/**
 * Get Kakao Alimtalk template categories
 */
export async function getKakaoTemplateCategories(): Promise<{
  success: boolean
  data: KakaoTemplateCategory[] | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const provider = await getSolapiProvider(tenantId)

    if (!provider) {
      throw new Error('먼저 Solapi API 설정을 완료해주세요.')
    }

    const categories = await provider.getKakaoAlimtalkTemplateCategories()

    return {
      success: true,
      data: categories,
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoTemplateCategories] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - Template CRUD
// ============================================================================

/**
 * Get all templates for current tenant
 */
export async function getKakaoTemplates(filters?: {
  status?: KakaoTemplateStatus
  name?: string
}): Promise<{
  success: boolean
  data: KakaoTemplate[] | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.name) {
      query = query.ilike('name', `%${filters.name}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: (data || []).map(mapDbToTemplate),
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoTemplates] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get single template by ID
 */
export async function getKakaoTemplate(templateId: string): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error

    return {
      success: true,
      data: data ? mapDbToTemplate(data) : null,
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create new Alimtalk template
 * This will create the template in Solapi (for inspection) and save to local DB
 */
export async function createKakaoTemplate(
  input: z.infer<typeof createTemplateSchema>
): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const validated = createTemplateSchema.parse(input)
    const supabase = createServiceRoleClient()

    // Get channel ID
    const channelId = await getTenantChannelId(tenantId)
    if (!channelId) {
      throw new Error('먼저 카카오 채널을 연동해주세요.')
    }

    // Get provider
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('먼저 Solapi API 설정을 완료해주세요.')
    }

    // Create template in Solapi
    const solapiResult = await provider.createKakaoAlimtalkTemplate({
      channelId,
      name: validated.name,
      content: validated.content,
      categoryCode: validated.categoryCode,
      messageType: validated.messageType,
      emphasizeType: validated.emphasizeType,
      emphasizeTitle: validated.emphasizeTitle,
      emphasizeSubtitle: validated.emphasizeSubtitle,
      buttons: validated.buttons as KakaoButton[],
      extraContent: validated.extraContent,
      adContent: validated.adContent,
      securityFlag: validated.securityFlag,
    })

    // Save to local DB
    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .insert({
        tenant_id: tenantId,
        solapi_template_id: solapiResult.solapiTemplateId,
        channel_id: channelId,
        name: validated.name,
        content: validated.content,
        category_code: validated.categoryCode,
        message_type: validated.messageType,
        emphasize_type: validated.emphasizeType,
        emphasize_title: validated.emphasizeTitle,
        emphasize_subtitle: validated.emphasizeSubtitle,
        buttons: validated.buttons || [],
        extra_content: validated.extraContent,
        ad_content: validated.adContent,
        security_flag: validated.securityFlag,
        status: solapiResult.status,
        inspected_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: mapDbToTemplate(data),
      error: null,
    }
  } catch (error) {
    console.error('[createKakaoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update existing template (re-submit for inspection)
 */
export async function updateKakaoTemplate(
  templateId: string,
  input: z.infer<typeof updateTemplateSchema>
): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const validated = updateTemplateSchema.parse(input)
    const supabase = createServiceRoleClient()

    // Get existing template
    const { data: existing, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')

    // Get provider
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('Solapi API 설정을 확인해주세요.')
    }

    // Update template in Solapi
    const solapiResult = await provider.updateKakaoAlimtalkTemplate(
      existing.solapi_template_id,
      {
        name: validated.name,
        content: validated.content,
        categoryCode: validated.categoryCode,
        messageType: validated.messageType,
        emphasizeType: validated.emphasizeType,
        emphasizeTitle: validated.emphasizeTitle,
        emphasizeSubtitle: validated.emphasizeSubtitle,
        buttons: validated.buttons as KakaoButton[],
        extraContent: validated.extraContent,
        adContent: validated.adContent,
        securityFlag: validated.securityFlag,
      }
    )

    // Update local DB
    const updateData: any = {
      status: solapiResult.status,
      rejection_reason: null, // Clear rejection reason on update
      updated_at: new Date().toISOString(),
    }

    if (validated.name) updateData.name = validated.name
    if (validated.content) updateData.content = validated.content
    if (validated.categoryCode) updateData.category_code = validated.categoryCode
    if (validated.messageType) updateData.message_type = validated.messageType
    if (validated.emphasizeType) updateData.emphasize_type = validated.emphasizeType
    if (validated.emphasizeTitle !== undefined) updateData.emphasize_title = validated.emphasizeTitle
    if (validated.emphasizeSubtitle !== undefined) updateData.emphasize_subtitle = validated.emphasizeSubtitle
    if (validated.buttons) updateData.buttons = validated.buttons
    if (validated.extraContent !== undefined) updateData.extra_content = validated.extraContent
    if (validated.adContent !== undefined) updateData.ad_content = validated.adContent
    if (validated.securityFlag !== undefined) updateData.security_flag = validated.securityFlag

    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: mapDbToTemplate(data),
      error: null,
    }
  } catch (error) {
    console.error('[updateKakaoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete template (only allowed for pending or rejected templates)
 */
export async function deleteKakaoTemplate(templateId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get existing template
    const { data: existing, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('solapi_template_id, status')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')

    // Only allow deletion of pending or rejected templates
    if (existing.status === 'approved' || existing.status === 'inspecting') {
      throw new Error('승인된 템플릿이나 검수 중인 템플릿은 삭제할 수 없습니다.')
    }

    // Delete from Solapi
    const provider = await getSolapiProvider(tenantId)
    if (provider) {
      try {
        await provider.deleteKakaoAlimtalkTemplate(existing.solapi_template_id)
      } catch (solapiError) {
        console.warn('[deleteKakaoTemplate] Solapi API error (continuing):', solapiError)
      }
    }

    // Soft delete in local DB
    const { error } = await supabase
      .from('kakao_alimtalk_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteKakaoTemplate] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Server Actions - Sync with Solapi
// ============================================================================

/**
 * Sync templates from Solapi to local DB
 * This updates the status of existing templates and imports new ones
 */
export async function syncKakaoTemplates(): Promise<{
  success: boolean
  syncedCount: number
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get channel ID
    const channelId = await getTenantChannelId(tenantId)
    if (!channelId) {
      throw new Error('카카오 채널이 연동되어 있지 않습니다.')
    }

    // Get provider
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('Solapi API 설정을 확인해주세요.')
    }

    // Get templates from Solapi
    const solapiTemplates = await provider.getKakaoAlimtalkTemplates(channelId)

    // Get existing templates from local DB
    const { data: localTemplates, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('id, solapi_template_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (fetchError) throw fetchError

    const localTemplateMap = new Map(
      (localTemplates || []).map((t) => [t.solapi_template_id, t.id])
    )

    let syncedCount = 0

    // Update existing templates and insert new ones
    for (const solapiTemplate of solapiTemplates) {
      const localId = localTemplateMap.get(solapiTemplate.solapiTemplateId)

      if (localId) {
        // Update existing template status
        await supabase
          .from('kakao_alimtalk_templates')
          .update({
            status: solapiTemplate.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', localId)

        syncedCount++
      } else {
        // Insert new template (was created externally)
        await supabase.from('kakao_alimtalk_templates').insert({
          tenant_id: tenantId,
          solapi_template_id: solapiTemplate.solapiTemplateId,
          channel_id: channelId,
          name: solapiTemplate.name,
          content: solapiTemplate.content,
          category_code: 'unknown', // Will need to fetch full details
          message_type: solapiTemplate.messageType,
          emphasize_type: 'NONE',
          buttons: solapiTemplate.buttons || [],
          status: solapiTemplate.status,
        })

        syncedCount++
      }
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      syncedCount,
      error: null,
    }
  } catch (error) {
    console.error('[syncKakaoTemplates] Error:', error)
    return {
      success: false,
      syncedCount: 0,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get detailed template info from Solapi (for rejection reason, etc.)
 */
export async function refreshTemplateStatus(templateId: string): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get existing template
    const { data: existing, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')

    // Get provider
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('Solapi API 설정을 확인해주세요.')
    }

    // Get detailed info from Solapi
    const solapiTemplate = await provider.getKakaoAlimtalkTemplate(
      existing.solapi_template_id
    )

    // Update local DB
    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .update({
        status: solapiTemplate.status,
        rejection_reason: solapiTemplate.rejectionReason,
        updated_at: new Date().toISOString(),
        ...(solapiTemplate.status === 'approved' && {
          approved_at: new Date().toISOString(),
        }),
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: mapDbToTemplate(data),
      error: null,
    }
  } catch (error) {
    console.error('[refreshTemplateStatus] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
