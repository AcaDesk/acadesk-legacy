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
import { ValidationError } from '@/lib/error-types'
import { getSolapiProvider } from '@/lib/messaging/get-solapi-provider'
import { translateSolapiError } from '@/lib/solapi-error-translator'
import type { KakaoChannel } from '@/infra/messaging/types/kakao.types'

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
})

/** 교육/학원 카테고리 코드를 Solapi API에서 자동 조회 */
async function resolveEducationCategoryCode(provider: { getKakaoChannelCategories: () => Promise<Array<{ code: string; name: string }>> }): Promise<string> {
  const categories = await provider.getKakaoChannelCategories()
  const education = categories.find((c) =>
    /교육|학원|학교|academy|education/i.test(c.name)
  )
  if (education) return education.code
  throw new ValidationError(
    'Solapi에서 교육/학원 카테고리를 찾지 못했습니다. 잠시 후 다시 시도하거나 Solapi 카테고리 설정을 확인해주세요.'
  )
}

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
    throw new ValidationError('채널 검색 ID를 입력해주세요.')
  }

  if (compact.includes('pf.kakao.com')) {
    throw new ValidationError(
      '채널 URL이 아닌 "검색용 아이디"를 입력해야 합니다. 예: @acadesk'
    )
  }

  // 대문자 → 소문자 정규화
  const normalized = compact.toLowerCase()
  const withAt = normalizeSearchIdWithAt(normalized)
  const withoutAt = withAt.replace(/^@/, '')

  if (withoutAt.startsWith('_')) {
    throw new ValidationError(
      '입력값은 채널 URL 식별자(_...)로 보입니다. 관리자센터의 "검색용 아이디"(@...)를 입력해주세요.'
    )
  }

  // 카카오 채널 가이드: 영문 소문자/숫자/한글/특수문자(._-), 2~15자
  if (!/^[가-힣a-z0-9._-]{2,15}$/.test(withoutAt)) {
    throw new ValidationError(
      '검색용 아이디 형식이 올바르지 않습니다. 2~15자 이내 한글/영문 소문자/숫자 또는 ._- 만 사용할 수 있습니다.'
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
    message.includes('이미 등록') ||
    message.includes('이미 다른 계정')
  )
}

function extractSolapiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('errorCode' in error && typeof error.errorCode === 'string') {
    return error.errorCode
  }

  if ('error' in error && typeof error.error === 'object' && error.error !== null) {
    const nestedError = error.error as Record<string, unknown>
    if ('code' in nestedError && typeof nestedError.code === 'string') {
      return nestedError.code
    }
  }

  return null
}

/**
 * Solapi SDK 에러에서 errorMessage 프로퍼티 추출
 */
function extractSolapiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  if ('errorMessage' in error && typeof error.errorMessage === 'string') {
    return error.errorMessage
  }
  return null
}

function getKakaoActionErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || '입력값이 올바르지 않습니다'
  }

  // Solapi SDK 에러: errorCode + errorMessage 모두 활용
  const solapiErrorCode = extractSolapiErrorCode(error)
  const solapiErrorMessage = extractSolapiErrorMessage(error)

  if (solapiErrorCode || solapiErrorMessage) {
    // 번역된 메시지 가져오기
    const translated = translateSolapiError(error)

    // Solapi 원본 errorMessage가 있고, 번역 결과와 다르면 원본도 표시
    if (solapiErrorMessage && !translated.includes(solapiErrorMessage)) {
      return `${translated} (${solapiErrorMessage})`
    }
    return translated
  }

  if (error instanceof Error) {
    if (/[\uac00-\ud7af]/.test(error.message)) {
      return error.message
    }

    const firstToken = error.message.split(/[:\s]/)[0]
    if (
      firstToken &&
      /^[A-Za-z][A-Za-z0-9]+$/.test(firstToken) &&
      !['ApiError', 'BadRequestError', 'DefaultError', 'Error', 'FromSolapiError', 'NetworkError', 'TypeError'].includes(firstToken)
    ) {
      return translateSolapiError(error)
    }
  }

  return getErrorMessage(error)
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
      throw new ValidationError('먼저 Solapi API 설정을 완료해주세요.')
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

    return {
      success: false,
      error: lastError || '채널 토큰 요청 실패',
    }
  } catch (error) {
    console.error('[requestKakaoChannelToken] Error:', error)
    return {
      success: false,
      error: getKakaoActionErrorMessage(error),
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
      throw new ValidationError('먼저 Solapi API 설정을 완료해주세요.')
    }

    // 교육/학원 카테고리 코드 자동 조회
    const categoryCode = await resolveEducationCategoryCode(provider)

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
          categoryCode,
        })
        break
      } catch (error) {
        console.warn('[createKakaoChannel] Candidate failed:', {
          candidateSearchId,
          error: getKakaoActionErrorMessage(error),
        })
        lastError = error
      }
    }

    // "이미 등록된 채널" 에러 시 기존 채널을 조회하여 복구
    if (!channel && lastError) {
      // 번역 전 원본 에러 코드 먼저 체크 (번역 결과에 의존하지 않도록)
      const solapiErrorCode = extractSolapiErrorCode(lastError)
      const errorMessage = getKakaoActionErrorMessage(lastError)
      if (solapiErrorCode === 'SearchIdInUse' || isSearchIdAlreadyInUseError(solapiErrorCode ?? errorMessage)) {
        try {
          const existingChannels = (
            await Promise.all(
              candidates.map((searchId) =>
                provider.getKakaoChannels({ searchId, limit: 100 }).catch(() => [])
              )
            )
          ).flat()
          const existing = existingChannels.find((ch) =>
            candidates.some((c) => ch.searchId === c || ch.searchId === `@${c}` || `@${ch.searchId}` === c)
          )
          if (existing) {
            console.info('[createKakaoChannel] Recovered already-registered channel:', existing.channelId)
            channel = existing
          } else {
            throw new ValidationError(
              '이 검색용 아이디는 현재 Solapi에 등록되어 있지 않습니다. 아이디를 다시 확인하거나, Solapi 대시보드에서 채널 상태를 확인해주세요.'
            )
          }
        } catch (recoveryError) {
          console.error('[createKakaoChannel] Recovery lookup failed:', recoveryError)
          if (recoveryError instanceof Error) {
            throw recoveryError
          }
          throw new Error(
            '채널 조회에 실패했습니다. 잠시 후 다시 시도하거나 Solapi 대시보드에서 채널 상태를 확인해주세요.'
          )
        }
      }
    }

    if (!channel) {
      throw lastError || new ValidationError('채널 연동 실패')
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
      error: getKakaoActionErrorMessage(error),
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
      throw new ValidationError('연동된 카카오 채널이 없습니다.')
    }

    // Remove channel from Solapi (must succeed before clearing DB)
    const provider = await getSolapiProvider(tenantId)
    if (!provider) {
      throw new ValidationError(
        'Solapi API 설정이 없어 원격 채널을 삭제할 수 없습니다. ' +
          '설정 페이지에서 Solapi 연동을 먼저 확인해주세요.'
      )
    }

    try {
      await provider.removeKakaoChannel(config.kakao_channel_id)
    } catch (solapiError) {
      console.error('[removeKakaoChannel] Solapi API error:', solapiError)
      throw new ValidationError(
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
      error: getKakaoActionErrorMessage(error),
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

// ============================================================================
// Server Actions - Channel Stats (지난 7일 발송 통계)
// ============================================================================

export interface KakaoChannelStats {
  /** 최근 7일 카카오 알림톡 발송 시도 건수 (sent + failed + pending) */
  totalCount: number
  /** sent 건수 */
  sentCount: number
  /** failed 건수 */
  failedCount: number
  /** pending 건수 */
  pendingCount: number
  /** sent / (sent + failed) — 분모 0이면 null */
  successRate: number | null
}

/**
 * 최근 7일 카카오 알림톡 발송 통계 — '알림 서비스 연동' 페이지 KPI 카드용
 *
 * - notification_logs 에서 tenant + 7일 + notification_type='kakao' 로 필터
 * - is_test=true 도 포함 (테스트 발송도 통계에 잡혀야 화면이 비어보이지 않음)
 */
export async function getKakaoChannelStats(): Promise<{
  success: boolean
  data: KakaoChannelStats
  error: string | null
}> {
  const empty: KakaoChannelStats = {
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
    successRate: null,
  }
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('notification_logs')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('notification_type', 'kakao')
      .gte('sent_at', sevenDaysAgo.toISOString())

    if (error) throw error

    let sent = 0
    let failed = 0
    let pending = 0
    for (const row of data || []) {
      if (row.status === 'sent') sent++
      else if (row.status === 'failed') failed++
      else if (row.status === 'pending') pending++
    }
    const denom = sent + failed
    const successRate = denom > 0 ? sent / denom : null

    return {
      success: true,
      data: {
        totalCount: sent + failed + pending,
        sentCount: sent,
        failedCount: failed,
        pendingCount: pending,
        successRate,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getKakaoChannelStats] Error:', error)
    return {
      success: false,
      data: empty,
      error: getErrorMessage(error),
    }
  }
}
