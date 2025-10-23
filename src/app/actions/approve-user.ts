/**
 * User Approval Server Actions
 *
 * Owner 권한을 가진 사용자만 대기 중인 사용자를 승인/거부할 수 있습니다.
 * 승인 시 새로운 Tenant가 생성되고 사용자가 owner로 설정됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyOwner } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ============================================================================
// Types & Validation Schemas
// ============================================================================

export interface ApproveUserResult {
  success: boolean
  error?: string
}

const approveUserSchema = z.object({
  userId: z.string().uuid('유효한 사용자 ID가 아닙니다'),
})

const rejectUserSchema = z.object({
  userId: z.string().uuid('유효한 사용자 ID가 아닙니다'),
  reason: z.string().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 사용자 승인 처리
 *
 * This action:
 * 1. Verifies owner permission
 * 2. Creates a new Tenant for the user
 * 3. Updates user status to 'approved' and role to 'owner'
 * 4. Links user to the new tenant
 *
 * @param userId - 승인할 사용자 ID
 */
export async function approveUser(userId: string): Promise<ApproveUserResult> {
  try {
    // 1. Verify authentication and owner permission
    const { userId: currentUserId } = await verifyOwner()

    // 2. Validate input
    const validated = approveUserSchema.parse({ userId })

    // 3. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    // 4. Get target user information
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', validated.userId)
      .single()

    if (targetUserError || !targetUser) {
      return { success: false, error: '승인 대상 사용자를 찾을 수 없습니다.' }
    }

    // 5. Create new Tenant for the user
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: `${targetUser.name || targetUser.email}의 학원`,
        slug: `academy-${Date.now()}`, // Temporary slug (can be changed in owner/setup)
        timezone: 'Asia/Seoul',
        settings: {},
      })
      .select('id')
      .single()

    if (tenantError || !newTenant) {
      console.error('[approveUser] Tenant creation error:', tenantError)
      return { success: false, error: 'Tenant 생성 중 오류가 발생했습니다.' }
    }

    // 6. Approve user and link to tenant
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: currentUserId,
        role_code: 'owner', // Grant owner permission
        tenant_id: newTenant.id, // Link to tenant
      })
      .eq('id', validated.userId)

    if (updateError) {
      console.error('[approveUser] User update error:', updateError)
      // Rollback: Delete created tenant
      await supabase.from('tenants').delete().eq('id', newTenant.id)
      return { success: false, error: '승인 처리 중 오류가 발생했습니다.' }
    }

    // 7. Invalidate cache
    revalidatePath('/admin/approvals')
    revalidatePath('/auth/pending')

    return { success: true }
  } catch (error) {
    console.error('[approveUser] Error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '승인 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 사용자 승인 거부
 *
 * This action:
 * 1. Verifies owner permission
 * 2. Updates user status to 'rejected'
 * 3. Stores rejection reason in settings
 *
 * @param userId - 거부할 사용자 ID
 * @param reason - 거부 사유 (optional)
 */
export async function rejectUser(
  userId: string,
  reason?: string
): Promise<ApproveUserResult> {
  try {
    // 1. Verify authentication and owner permission
    const { userId: currentUserId } = await verifyOwner()

    // 2. Validate input
    const validated = rejectUserSchema.parse({ userId, reason })

    // 3. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    // 4. Reject user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: currentUserId,
        settings: {
          rejection_reason: validated.reason || '승인 거부됨',
          rejected_at: new Date().toISOString(),
        },
      })
      .eq('id', validated.userId)

    if (updateError) {
      console.error('[rejectUser] User update error:', updateError)
      return { success: false, error: '거부 처리 중 오류가 발생했습니다.' }
    }

    // 5. Invalidate cache
    revalidatePath('/admin/approvals')

    return { success: true }
  } catch (error) {
    console.error('[rejectUser] Error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '거부 처리 중 오류가 발생했습니다.' }
  }
}
