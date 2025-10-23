/**
 * Staff Invitation Server Actions
 *
 * Owner/Instructor 권한을 가진 사용자만 직원을 초대할 수 있습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyRole } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { randomBytes } from 'crypto'

// ============================================================================
// Types & Validation Schemas
// ============================================================================

export interface InvitationResult {
  success: boolean
  error?: string
  invitationId?: string
}

const inviteStaffSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  roleCode: z.enum(['instructor', 'assistant'], {
    message: '유효한 역할을 선택하세요 (instructor, assistant)'
  }),
})

const cancelInvitationSchema = z.object({
  invitationId: z.string().uuid('유효한 초대 ID가 아닙니다'),
})

// ============================================================================
// Helper Functions
// ============================================================================

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 직원 초대 생성
 *
 * This action:
 * 1. Verifies owner/instructor permission
 * 2. Creates invitation with token
 * 3. Sets expiration to 7 days
 *
 * @param input - Email and role code
 */
export async function inviteStaff(
  input: z.infer<typeof inviteStaffSchema>
): Promise<InvitationResult> {
  try {
    // 1. Verify authentication and permission (owner or instructor)
    const { tenantId, userId } = await verifyRole(['owner', 'instructor'])

    // 2. Validate input
    const validated = inviteStaffSchema.parse(input)

    // 3. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    // 4. Check if email is already invited
    const { data: existingInvitation } = await supabase
      .from('staff_invitations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('email', validated.email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvitation) {
      return {
        success: false,
        error: '이미 해당 이메일로 대기 중인 초대가 있습니다.'
      }
    }

    // 5. Create invitation
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { data: invitation, error: invitationError } = await supabase
      .from('staff_invitations')
      .insert({
        tenant_id: tenantId,
        invited_by: userId,
        email: validated.email,
        role_code: validated.roleCode,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (invitationError || !invitation) {
      console.error('[inviteStaff] Invitation creation error:', invitationError)
      return { success: false, error: '초대 생성에 실패했습니다.' }
    }

    // TODO: Send invitation email
    // await sendInvitationEmail(validated.email, token)

    // 6. Invalidate cache
    revalidatePath('/staff')

    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('[inviteStaff] Error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '초대 생성 중 오류가 발생했습니다.' }
  }
}

/**
 * 초대 취소
 *
 * This action:
 * 1. Verifies owner/instructor permission
 * 2. Updates invitation status to 'cancelled'
 *
 * @param invitationId - Invitation ID to cancel
 */
export async function cancelInvitation(
  invitationId: string
): Promise<InvitationResult> {
  try {
    // 1. Verify authentication and permission (owner or instructor)
    const { tenantId } = await verifyRole(['owner', 'instructor'])

    // 2. Validate input
    const validated = cancelInvitationSchema.parse({ invitationId })

    // 3. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    // 4. Cancel invitation (update status)
    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id', validated.invitationId)
      .eq('tenant_id', tenantId) // Ensure user can only cancel their tenant's invitations

    if (updateError) {
      console.error('[cancelInvitation] Update error:', updateError)
      return { success: false, error: '초대 취소에 실패했습니다.' }
    }

    // 5. Invalidate cache
    revalidatePath('/staff')

    return { success: true }
  } catch (error) {
    console.error('[cancelInvitation] Error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '초대 취소 중 오류가 발생했습니다.' }
  }
}
