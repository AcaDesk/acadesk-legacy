/**
 * Invite Staff Use Case
 * 직원 초대 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { ValidationError, AuthorizationError } from '@/lib/error-types'
import { randomBytes } from 'crypto'

export interface InviteStaffDTO {
  email: string
  roleCode: 'instructor' | 'assistant'
  message?: string
}

export class InviteStaffUseCase {
  private supabase = createClient()

  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  async execute(dto: InviteStaffDTO): Promise<{ invitationId: string }> {
    // 현재 사용자 정보 가져오기
    const {
      data: { user },
    } = await this.supabase.auth.getUser()

    if (!user) {
      throw new AuthorizationError('로그인이 필요합니다')
    }

    // 사용자의 tenant_id 가져오기
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('tenant_id, role_code')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw new AuthorizationError('권한이 없습니다')
    }

    // 원장(admin)만 초대 가능
    if (userData.role_code !== 'admin') {
      throw new AuthorizationError('원장만 직원을 초대할 수 있습니다')
    }

    // 초대 생성
    const token = this.generateToken()
    const { data: invitation, error: invitationError } = await this.supabase
      .from('staff_invitations')
      .insert({
        tenant_id: userData.tenant_id,
        invited_by: user.id,
        email: dto.email,
        role_code: dto.roleCode,
        token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
      })
      .select()
      .single()

    if (invitationError || !invitation) {
      throw new ValidationError('초대 생성에 실패했습니다')
    }

    // TODO: 초대 이메일 전송
    // await sendInvitationEmail(dto.email, token)

    return { invitationId: invitation.id }
  }
}
