/**
 * Staff Invitation Server Actions
 *
 * Owner/Instructor 권한을 가진 사용자만 직원을 초대할 수 있습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
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

const roleLabels: Record<string, string> = {
  instructor: '강사',
  assistant: '조교',
}

/**
 * 직원 초대 이메일 발송 (fire-and-forget — 실패해도 초대 자체는 성공)
 */
async function sendInvitationEmail(params: {
  email: string
  token: string
  inviterName: string
  tenantName: string
  roleCode: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[sendInvitationEmail] RESEND_API_KEY 미설정 — 이메일 발송 skip')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const acceptUrl = `${appUrl}/auth/invite/accept?token=${params.token}`
  const roleLabel = roleLabels[params.roleCode] || params.roleCode

  const text = [
    `안녕하세요,`,
    ``,
    `${params.inviterName}님이 ${params.tenantName} 학원의 ${roleLabel}로 회원님을 초대했습니다.`,
    ``,
    `아래 링크를 클릭해 초대를 수락하세요 (7일 이내 만료):`,
    acceptUrl,
    ``,
    `처음 사용하시는 경우 회원가입 후 자동으로 학원에 합류됩니다.`,
    `이미 가입된 이메일이라면 로그인 후 합류 처리가 진행됩니다.`,
    ``,
    `초대를 받지 않으셨다면 이 메일을 무시하셔도 됩니다.`,
    ``,
    `—`,
    `Acadesk`,
  ].join('\n')

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'Acadesk <noreply@acadesk.kr>',
      to: params.email,
      subject: `[Acadesk] ${params.tenantName} 학원 ${roleLabel} 초대`,
      text,
    })
  } catch (err) {
    console.error('[sendInvitationEmail] 발송 실패:', err)
  }
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

    // 6. Send invitation email (fire-and-forget — 실패해도 초대 자체는 성공)
    const [{ data: inviter }, { data: tenant }] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).maybeSingle(),
      supabase.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
    ])

    void sendInvitationEmail({
      email: validated.email,
      token,
      inviterName: inviter?.name || '학원 관리자',
      tenantName: tenant?.name || '학원',
      roleCode: validated.roleCode,
    })

    // 7. Invalidate cache
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
