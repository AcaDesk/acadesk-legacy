/**
 * Get Invitation By Token Use Case
 * 초대 토큰으로 초대 정보 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { ValidationError, NotFoundError } from '@/lib/error-types'

export interface InvitationDTO {
  id: string
  tenantId: string
  invitedBy: string
  email: string
  roleCode: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
}

export class GetInvitationByTokenUseCase {
  private supabase = createClient()

  async execute(token: string): Promise<InvitationDTO> {
    const { data, error } = await this.supabase
      .from('staff_invitations')
      .select(`
        id,
        tenant_id,
        invited_by,
        email,
        role_code,
        token,
        status,
        expires_at,
        created_at
      `)
      .eq('token', token)
      .single()

    if (error || !data) {
      throw new NotFoundError('초대')
    }

    // 만료 확인
    if (new Date(data.expires_at) < new Date()) {
      throw new ValidationError('초대가 만료되었습니다')
    }

    // 상태 확인
    if (data.status !== 'pending') {
      throw new ValidationError('이미 사용된 초대입니다')
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      invitedBy: data.invited_by,
      email: data.email,
      roleCode: data.role_code,
      token: data.token,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    }
  }
}
