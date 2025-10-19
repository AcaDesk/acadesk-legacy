/**
 * Get Invitations Use Case
 * 학원의 모든 초대 목록 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { AuthorizationError, DatabaseError } from '@/lib/error-types'
import type { InvitationDTO } from './GetInvitationByTokenUseCase'

export class GetInvitationsUseCase {
  private supabase = createClient()

  async execute(): Promise<InvitationDTO[]> {
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
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw new AuthorizationError('권한이 없습니다')
    }

    // 초대 목록 조회
    const { data, error } = await this.supabase
      .from('staff_invitations')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new DatabaseError('초대 목록을 가져올 수 없습니다', error)
    }

    return data.map((inv) => ({
      id: inv.id,
      tenantId: inv.tenant_id,
      invitedBy: inv.invited_by,
      email: inv.email,
      roleCode: inv.role_code,
      token: inv.token,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }))
  }
}
