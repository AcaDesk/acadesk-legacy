/**
 * Kakao Alimtalk Template Server Actions
 *
 * 카카오 알림톡 템플릿 관리
 * - 템플릿 생성, 조회, 수정, 삭제
 * - 솔라피 API와 로컬 DB 동기화
 */

'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { getSolapiProvider } from '@/lib/messaging/get-solapi-provider'
import { translateSolapiError, isSolapiError } from '@/lib/solapi-error-translator'

/**
 * Solapi 호출 단계에서 던진 에러인지에 따라 메시지를 분기.
 * Solapi 에러: 사용자가 직접 Solapi 콘솔에서 조치할 수 있는 안내 포함.
 * 그 외(DB/내부): 일반화된 한국어 메시지.
 */
function translateActionError(error: unknown): string {
  return isSolapiError(error) ? translateSolapiError(error) : getErrorMessage(error)
}
import type {
  KakaoTemplateCategory,
  KakaoTemplateStatus,
  KakaoMessageType,
  KakaoEmphasizeType,
  KakaoButton,
} from '@/infra/messaging/types/kakao.types'
import {
  kakaoTemplateSchema,
  kakaoTemplateUpdateSchema,
} from '@/lib/kakao/kakao-validation'

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
  /** 공용 템플릿에서 자동 프로비저닝된 경우 NOT NULL. 학원장이 직접 편집/삭제 불가 */
  sharedTemplateId: string | null
  createdAt: string
  updatedAt: string
}

interface KakaoTemplateActionResult {
  success: boolean
  data: KakaoTemplate | null
  error: string | null
  warning?: string | null
}

// ============================================================================
// Validation Schemas (re-exported from shared module)
// ============================================================================

const createTemplateSchema = kakaoTemplateSchema
const updateTemplateSchema = kakaoTemplateUpdateSchema

// ============================================================================
// Helper Functions
// ============================================================================

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    sharedTemplateId: row.shared_template_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildInspectionWarning(error: unknown): string {
  return `템플릿은 저장되었지만 검수 요청에 실패했습니다. 템플릿 목록에서 다시 검수 요청해주세요. (${translateSolapiError(error)})`
}

// ============================================================================
// Server Actions - Template Categories
// ============================================================================

/**
 * Internal: Solapi 카카오 템플릿 카테고리 fetch (tenantId 별 24시간 캐시).
 *
 * Solapi 카테고리는 시스템 전역 데이터로 거의 변동 없음 (분기별 미만).
 * 따라서 tenantId 키링으로 long-term 캐싱하여 모달 진입 시 외부 API 왕복(100~500ms)을 제거한다.
 *
 * 캐시 무효화가 필요한 경우:
 *   revalidateTag('kakao-template-categories')
 *
 * verifyStaff() 는 cookies 의존성으로 dynamic 이므로 캐시 함수 바깥에서 호출.
 */
const fetchKakaoCategoriesCached = unstable_cache(
  async (
    tenantId: string,
  ): Promise<{
    success: boolean
    data: KakaoTemplateCategory[] | null
    error: string | null
  }> => {
    try {
      const provider = await getSolapiProvider(tenantId)
      if (!provider) {
        return {
          success: false,
          data: null,
          error: '먼저 Solapi API 설정을 완료해주세요.',
        }
      }
      const categories = await provider.getKakaoAlimtalkTemplateCategories()
      return { success: true, data: categories, error: null }
    } catch (error) {
      console.error('[getKakaoTemplateCategories] Error:', error)
      return {
        success: false,
        data: null,
        error: isSolapiError(error)
          ? translateSolapiError(error)
          : getErrorMessage(error),
      }
    }
  },
  ['kakao-template-categories'],
  { revalidate: 86400, tags: ['kakao-template-categories'] },
)

/**
 * Get Kakao Alimtalk template categories (24h cached)
 */
export async function getKakaoTemplateCategories(): Promise<{
  success: boolean
  data: KakaoTemplateCategory[] | null
  error: string | null
}> {
  const { tenantId } = await verifyStaff()
  return fetchKakaoCategoriesCached(tenantId)
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
      const safeName = filters.name.trim().slice(0, 100).replace(/[%_\\]/g, '\\$&')
      query = query.ilike('name', `%${safeName}%`)
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
      error: translateActionError(error),
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
      error: translateActionError(error),
    }
  }
}

/**
 * Create new Alimtalk template
 * This will create the template in Solapi (for inspection) and save to local DB
 */
export async function createKakaoTemplate(
  input: z.infer<typeof createTemplateSchema>
): Promise<KakaoTemplateActionResult> {
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

    // Save to local DB as the exact Solapi status first. Newly created templates are
    // normally PENDING until the separate inspection request succeeds.
    const { data: createdTemplate, error } = await supabase
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
        ...(solapiResult.status !== 'pending' && {
          inspected_at: new Date().toISOString(),
        }),
      })
      .select()
      .single()

    if (error) throw error

    let templateRow = createdTemplate
    let warning: string | null = null

    if (solapiResult.status === 'pending') {
      try {
        const inspectionResult = await provider.requestKakaoAlimtalkTemplateInspection(
          solapiResult.solapiTemplateId
        )
        const { data: inspectedTemplate, error: inspectionUpdateError } = await supabase
          .from('kakao_alimtalk_templates')
          .update({
            status: inspectionResult.status,
            rejection_reason: null,
            inspected_at: new Date().toISOString(),
            ...(inspectionResult.status === 'approved' && {
              approved_at: new Date().toISOString(),
            }),
          })
          .eq('id', createdTemplate.id)
          .select()
          .single()

        if (inspectionUpdateError) throw inspectionUpdateError
        templateRow = inspectedTemplate
      } catch (inspectionError) {
        console.warn('[createKakaoTemplate] Inspection request failed:', inspectionError)
        warning = buildInspectionWarning(inspectionError)
      }
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: mapDbToTemplate(templateRow),
      error: null,
      warning,
    }
  } catch (error) {
    console.error('[createKakaoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: translateActionError(error),
    }
  }
}

/**
 * Update existing template (re-submit for inspection)
 */
export async function updateKakaoTemplate(
  templateId: string,
  input: z.infer<typeof updateTemplateSchema>
): Promise<KakaoTemplateActionResult> {
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

    // 공용 템플릿 사본은 학원장이 직접 수정할 수 없다 (요구사항 #5)
    if (existing.shared_template_id) {
      throw new Error('공용 템플릿은 직접 수정할 수 없습니다. 다시 등록(재동기화)을 사용해주세요.')
    }

    if (existing.status === 'inspecting') {
      throw new Error('검수 중인 템플릿은 수정할 수 없습니다. 검수를 취소한 뒤 수정해주세요.')
    }

    if (existing.status === 'approved') {
      throw new Error('승인된 템플릿은 내용을 수정할 수 없습니다. 새 템플릿으로 등록해주세요.')
    }

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
    const updateData: Record<string, unknown> = {
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

    const { data: updatedTemplate, error } = await supabase
      .from('kakao_alimtalk_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error

    let templateRow = updatedTemplate
    let warning: string | null = null

    if (solapiResult.status === 'pending') {
      try {
        const inspectionResult = await provider.requestKakaoAlimtalkTemplateInspection(
          existing.solapi_template_id
        )
        const { data: inspectedTemplate, error: inspectionUpdateError } = await supabase
          .from('kakao_alimtalk_templates')
          .update({
            status: inspectionResult.status,
            rejection_reason: null,
            inspected_at: new Date().toISOString(),
            ...(inspectionResult.status === 'approved' && {
              approved_at: new Date().toISOString(),
            }),
          })
          .eq('id', templateId)
          .select()
          .single()

        if (inspectionUpdateError) throw inspectionUpdateError
        templateRow = inspectedTemplate
      } catch (inspectionError) {
        console.warn('[updateKakaoTemplate] Inspection request failed:', inspectionError)
        warning = buildInspectionWarning(inspectionError)
      }
    }

    revalidatePath('/settings/messaging-integration')

    return {
      success: true,
      data: mapDbToTemplate(templateRow),
      error: null,
      warning,
    }
  } catch (error) {
    console.error('[updateKakaoTemplate] Error:', error)
    return {
      success: false,
      data: null,
      error: translateActionError(error),
    }
  }
}

/**
 * Request inspection for an already-created pending template.
 */
export async function requestKakaoTemplateInspection(
  templateId: string,
  comment?: string
): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: existing, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')
    if (existing.status !== 'pending') {
      throw new Error('대기 상태의 템플릿만 검수를 요청할 수 있습니다.')
    }

    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('Solapi API 설정을 확인해주세요.')
    }

    const inspectionResult = await provider.requestKakaoAlimtalkTemplateInspection(
      existing.solapi_template_id,
      comment
    )

    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .update({
        status: inspectionResult.status,
        rejection_reason: null,
        inspected_at: new Date().toISOString(),
        ...(inspectionResult.status === 'approved' && {
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
    console.error('[requestKakaoTemplateInspection] Error:', error)
    return {
      success: false,
      data: null,
      error: isSolapiError(error)
        ? translateSolapiError(error)
        : error instanceof Error
          ? error.message
          : getErrorMessage(error),
    }
  }
}

/**
 * Cancel inspection for an inspecting template so it can be edited again.
 */
export async function cancelKakaoTemplateInspection(templateId: string): Promise<{
  success: boolean
  data: KakaoTemplate | null
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: existing, error: fetchError } = await supabase
      .from('kakao_alimtalk_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')
    if (existing.status !== 'inspecting') {
      throw new Error('검수 중인 템플릿만 검수를 취소할 수 있습니다.')
    }

    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new Error('Solapi API 설정을 확인해주세요.')
    }

    const cancelResult = await provider.cancelKakaoAlimtalkTemplateInspection(
      existing.solapi_template_id
    )

    const { data, error } = await supabase
      .from('kakao_alimtalk_templates')
      .update({
        status: cancelResult.status,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
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
    console.error('[cancelKakaoTemplateInspection] Error:', error)
    return {
      success: false,
      data: null,
      error: isSolapiError(error)
        ? translateSolapiError(error)
        : error instanceof Error
          ? error.message
          : getErrorMessage(error),
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
      .select('solapi_template_id, status, shared_template_id')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) throw new Error('템플릿을 찾을 수 없습니다.')

    // 공용 템플릿 사본은 직접 삭제할 수 없다 (요구사항 #5)
    if (existing.shared_template_id) {
      throw new Error('공용 템플릿은 직접 삭제할 수 없습니다. 이벤트 구독을 비활성화하거나 재동기화를 사용해주세요.')
    }

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
      error: translateActionError(error),
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

    // 업데이트할 템플릿과 새로 삽입할 템플릿 분류
    const templatesToUpdate: Array<{ id: string; status: string }> = []
    const templatesToInsert: Array<{
      tenant_id: string
      solapi_template_id: string
      channel_id: string
      name: string
      content: string
      category_code: string
      message_type: string
      emphasize_type: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buttons: any[]
      status: string
    }> = []

    for (const solapiTemplate of solapiTemplates) {
      const localId = localTemplateMap.get(solapiTemplate.solapiTemplateId)

      if (localId) {
        templatesToUpdate.push({ id: localId, status: solapiTemplate.status })
      } else {
        templatesToInsert.push({
          tenant_id: tenantId,
          solapi_template_id: solapiTemplate.solapiTemplateId,
          channel_id: channelId,
          name: solapiTemplate.name,
          content: solapiTemplate.content,
          category_code: 'unknown',
          message_type: solapiTemplate.messageType,
          emphasize_type: 'NONE',
          buttons: solapiTemplate.buttons || [],
          status: solapiTemplate.status,
        })
      }
    }

    // 병렬 처리: 업데이트와 삽입
    const now = new Date().toISOString()

    await Promise.all([
      // 업데이트: Promise.all로 병렬 처리
      ...templatesToUpdate.map(t =>
        supabase
          .from('kakao_alimtalk_templates')
          .update({ status: t.status, updated_at: now })
          .eq('id', t.id)
      ),
      // 삽입: 배치 INSERT (1회)
      templatesToInsert.length > 0
        ? supabase.from('kakao_alimtalk_templates').insert(templatesToInsert)
        : Promise.resolve(),
    ])

    const syncedCount = templatesToUpdate.length + templatesToInsert.length

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
      error: translateActionError(error),
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
      error: translateActionError(error),
    }
  }
}
