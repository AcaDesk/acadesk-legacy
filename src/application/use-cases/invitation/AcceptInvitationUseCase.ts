/**
 * Accept Invitation Use Case
 * 초대 수락 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/error-types'
import { GetInvitationByTokenUseCase } from './GetInvitationByTokenUseCase'

export class AcceptInvitationUseCase {
  private supabase = createClient()
  private getInvitationByTokenUseCase = new GetInvitationByTokenUseCase()

  async execute(token: string, userId: string): Promise<void> {
    // 초대 정보 확인 (유효성 검증)
    await this.getInvitationByTokenUseCase.execute(token)

    // 초대 상태 업데이트
    const { error: updateError } = await this.supabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('token', token)

    if (updateError) {
      throw new DatabaseError('초대 수락에 실패했습니다', updateError)
    }
  }
}
