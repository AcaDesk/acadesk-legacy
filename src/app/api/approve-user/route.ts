import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * POST /api/approve-user
 * 사용자 승인/거부 처리
 *
 * Body:
 * - userId: string (required)
 * - action: 'approve' | 'reject' (required)
 * - reason?: string (reject 시 사용)
 */
export async function POST(req: Request) {
  try {
    const { userId, action, reason } = await req.json()

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 액션입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // 현재 로그인한 사용자 확인 (승인 권한 체크)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // 현재 사용자의 role 확인 (owner만 승인 가능)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_code')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || currentUser.role_code !== 'owner') {
      return NextResponse.json(
        { success: false, error: '승인 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 승인 대상 사용자 정보 조회
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { success: false, error: '승인 대상 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      // 사용자 승인 처리
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
        return NextResponse.json(
          { success: false, error: '승인 처리 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      // 캐시 무효화
      revalidatePath('/admin/approvals')
      revalidatePath('/auth/pending')

      return NextResponse.json({ success: true })
    } else {
      // 사용자 거부 처리
      const { error: updateError } = await supabase
        .from('users')
        .update({
          approval_status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          settings: {
            rejection_reason: reason || '승인 거부됨',
            rejected_at: new Date().toISOString(),
          },
        })
        .eq('id', userId)

      if (updateError) {
        console.error('사용자 거부 오류:', updateError)
        return NextResponse.json(
          { success: false, error: '거부 처리 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      // 캐시 무효화
      revalidatePath('/admin/approvals')

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('API /approve-user 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
