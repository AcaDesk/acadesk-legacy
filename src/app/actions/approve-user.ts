'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ApproveUserResult {
  success: boolean
  error?: string
}

/**
 * 사용자 승인 처리
 * @param userId 승인할 사용자 ID
 */
export async function approveUser(userId: string): Promise<ApproveUserResult> {
  try {
    const supabase = await createServerClient()

    // 현재 로그인한 사용자 확인 (승인 권한 체크)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: '인증되지 않은 사용자입니다.' }
    }

    // 현재 사용자의 슈퍼어드민 권한 확인 (슈퍼어드민만 승인 가능)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || !currentUser.is_super_admin) {
      return { success: false, error: '승인 권한이 없습니다. 슈퍼어드민만 사용할 수 있습니다.' }
    }

    // 승인 대상 사용자 정보 조회
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return { success: false, error: '승인 대상 사용자를 찾을 수 없습니다.' }
    }

    // 사용자 승인 처리
    // role_code를 'owner'로 설정해야 get_auth_stage가 제대로 작동함
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        role_code: 'owner', // 승인과 동시에 원장 권한 부여
      })
      .eq('id', userId)

    if (updateError) {
      console.error('사용자 승인 오류:', updateError)
      return { success: false, error: '승인 처리 중 오류가 발생했습니다.' }
    }

    // 캐시 무효화
    revalidatePath('/dashboard')
    revalidatePath('/auth/pending')

    return { success: true }
  } catch (error) {
    console.error('사용자 승인 오류:', error)
    return { success: false, error: '승인 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 사용자 승인 거부
 * @param userId 거부할 사용자 ID
 * @param reason 거부 사유
 */
export async function rejectUser(
  userId: string,
  reason?: string
): Promise<ApproveUserResult> {
  try {
    const supabase = await createServerClient()

    // 현재 로그인한 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: '인증되지 않은 사용자입니다.' }
    }

    // 현재 사용자의 슈퍼어드민 권한 확인 (슈퍼어드민만 거부 가능)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || !currentUser.is_super_admin) {
      return { success: false, error: '거부 권한이 없습니다. 슈퍼어드민만 사용할 수 있습니다.' }
    }

    // 사용자 거부 처리
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        // 거부 사유를 settings에 저장
        settings: {
          rejection_reason: reason || '승인 거부됨',
          rejected_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)

    if (updateError) {
      console.error('사용자 거부 오류:', updateError)
      return { success: false, error: '거부 처리 중 오류가 발생했습니다.' }
    }

    // 캐시 무효화
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('사용자 거부 오류:', error)
    return { success: false, error: '거부 처리 중 오류가 발생했습니다.' }
  }
}
