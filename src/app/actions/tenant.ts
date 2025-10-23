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
    const supabase = await createServiceRoleClient()

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
