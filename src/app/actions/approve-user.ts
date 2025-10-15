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

    // 현재 사용자의 role 확인 (owner만 승인 가능)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_code')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || currentUser.role_code !== 'owner') {
      return { success: false, error: '승인 권한이 없습니다.' }
    }

    // 사용자 승인 처리
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('사용자 승인 오류:', updateError)
      return { success: false, error: '승인 처리 중 오류가 발생했습니다.' }
    }

    // 캐시 무효화
    revalidatePath('/dashboard')
    revalidatePath('/auth/pending-approval')

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

    // 현재 사용자의 role 확인 (owner만 거부 가능)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_code')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || currentUser.role_code !== 'owner') {
      return { success: false, error: '거부 권한이 없습니다.' }
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
