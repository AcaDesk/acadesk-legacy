/**
 * Cancel Invitation Use Case
 * 초대 취소 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/error-types'

export class CancelInvitationUseCase {
  private supabase = createClient()

  async execute(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) {
      throw new DatabaseError('초대 취소에 실패했습니다', error)
    }
  }
}
