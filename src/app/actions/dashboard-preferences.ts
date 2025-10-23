/**
 * Dashboard Preferences Server Actions
 *
 * service_role 기반으로 대시보드 설정을 저장합니다.
 * RLS를 우회하여 users 테이블에 직접 접근합니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyPermission } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DashboardPreferences } from '@/types/dashboard'

// ============================================================================
// Types & Validation Schemas
// ============================================================================

export interface PreferencesResult {
  success: boolean
  error?: string
  preferences?: DashboardPreferences
}

const saveDashboardPreferencesSchema = z.object({
  preferences: z.any(), // DashboardPreferences type is complex, validate at runtime
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 대시보드 설정 저장
 *
 * This action:
 * 1. Verifies user authentication
 * 2. Uses service_role to update users table (bypasses RLS)
 * 3. Merges new preferences with existing preferences
 *
 * @param preferences - Dashboard preferences object
 */
export async function saveDashboardPreferences(
  preferences: DashboardPreferences
): Promise<PreferencesResult> {
  try {
    // 1. Verify authentication (모든 인증된 사용자가 자신의 설정 저장 가능)
    const { userId } = await verifyPermission()

    // 2. Validate input
    const validated = saveDashboardPreferencesSchema.parse({ preferences })

    // 3. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    // 4. Get current preferences
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[saveDashboardPreferences] Fetch error:', fetchError)
      return { success: false, error: '현재 설정을 가져오는 중 오류가 발생했습니다.' }
    }

    const currentPreferences = currentData?.preferences || {}

    // 5. Update dashboard preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({
        preferences: {
          ...currentPreferences,
          dashboard: validated.preferences
        }
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[saveDashboardPreferences] Update error:', updateError)
      return { success: false, error: '설정 저장에 실패했습니다.' }
    }

    // 6. Invalidate cache
    revalidatePath('/dashboard')

    return { success: true, preferences: validated.preferences }
  } catch (error) {
    console.error('[saveDashboardPreferences] Error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '설정 저장 중 오류가 발생했습니다.' }
  }
}
