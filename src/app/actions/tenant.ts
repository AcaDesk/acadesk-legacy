/**
 * Tenant Management Server Actions
 *
 * 테넌트 관련 Server Actions
 */

'use server'

import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 테넌트 코드 조회
 * @param codeType - 코드 타입 (예: 'school', 'grade', etc.)
 * @returns 코드 목록
 */
export async function getTenantCodes(codeType: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('tenant_codes')
      .select('code')
      .eq('tenant_id', tenantId)
      .eq('code_type', codeType)
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error

    // Extract codes as string array
    const codes = data?.map((item) => item.code) || []

    return { success: true, data: codes }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), data: [] }
  }
}

/**
 * 시험 카테고리 추가
 * @param code - 카테고리 코드
 * @param label - 카테고리 레이블
 * @returns 성공 여부
 */
export async function addExamCategory(code: string, label: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('tenant_codes')
      .insert({
        tenant_id: tenantId,
        type: 'exam_category',
        code,
        label,
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 시험 카테고리 삭제 (소프트 삭제)
 * @param code - 카테고리 코드
 * @returns 성공 여부
 */
export async function deleteExamCategory(code: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('tenant_codes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('type', 'exam_category')
      .eq('code', code)

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}
