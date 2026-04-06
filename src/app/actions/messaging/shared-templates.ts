/**
 * Shared Alimtalk Template Server Actions
 *
 * 아카데스크 공용 알림톡 템플릿 조회
 * - 플랫폼 레벨 템플릿 (모든 학원 공유)
 * - 이벤트 구독 UI에서 사용
 */

'use server'

import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Types
// ============================================================================

export interface SharedTemplate {
  id: string
  eventType: string
  name: string
  description: string | null
  content: string
  categoryCode: string
  messageType: string
  emphasizeType: string
  emphasizeTitle: string | null
  emphasizeSubtitle: string | null
  buttons: unknown[]
  quickReplies: unknown[]
  variables: string[]
  securityFlag: boolean
  isActive: boolean
  version: number
}

// ============================================================================
// Helper
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToSharedTemplate(row: any): SharedTemplate {
  return {
    id: row.id,
    eventType: row.event_type,
    name: row.name,
    description: row.description,
    content: row.content,
    categoryCode: row.category_code,
    messageType: row.message_type,
    emphasizeType: row.emphasize_type,
    emphasizeTitle: row.emphasize_title,
    emphasizeSubtitle: row.emphasize_subtitle,
    buttons: row.buttons || [],
    quickReplies: row.quick_replies || [],
    variables: row.variables || [],
    securityFlag: row.security_flag,
    isActive: row.is_active,
    version: row.version,
  }
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 전체 활성 공용 템플릿 목록 조회
 */
export async function getSharedTemplates(): Promise<{
  success: boolean
  data: SharedTemplate[]
  error: string | null
}> {
  try {
    await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('shared_alimtalk_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: (data || []).map(mapDbToSharedTemplate),
      error: null,
    }
  } catch (error) {
    console.error('[getSharedTemplates] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 특정 이벤트 타입의 공용 템플릿 조회
 */
export async function getSharedTemplateByEventType(eventType: string): Promise<{
  success: boolean
  data: SharedTemplate | null
  error: string | null
}> {
  try {
    await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('shared_alimtalk_templates')
      .select('*')
      .eq('event_type', eventType)
      .maybeSingle()

    if (error) throw error

    return {
      success: true,
      data: data ? mapDbToSharedTemplate(data) : null,
      error: null,
    }
  } catch (error) {
    console.error('[getSharedTemplateByEventType] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
