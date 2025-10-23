/**
 * Auth Layout (Server Component)
 *
 * 인증 관련 페이지(/auth/*)의 레이아웃
 *
 * ✅ 역할:
 * - 이메일 인증 완료 + 로그인된 사용자만 리다이렉트
 * - 이메일 미인증 사용자는 인증 페이지 사용 가능
 * - 온보딩 상태에 따라 적절한 페이지로 이동
 * - 인증 페이지 공통 UI 제공 (로고, 배경)
 *
 * 무한 루프 방지:
 * - 로그인 O + 이메일 미인증 → children 렌더 (리다이렉트 금지)
 * - 로그인 O + 이메일 인증 완료 → 온보딩 체크 후 리다이렉트
 * - 온보딩 체크 실패 시 redirect 대신 auth UI 렌더 (루프 방지)
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkOnboardingStage } from '@/app/actions/onboarding'

// Edge 런타임 방지 - checkOnboardingStage가 service_role 사용
export const runtime = 'nodejs'

/**
 * Auth 페이지 공통 UI 프레임
 */
function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-muted/40 py-8 px-4">
      <div className="w-full max-w-lg mx-auto space-y-8">
        {/* 공통 로고 */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 font-semibold"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-2xl">Acadesk</span>
        </Link>

        {/* 각 페이지의 실제 콘텐츠 */}
        {children}
      </div>
    </div>
  )
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. 현재 사용자 세션 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 2. 로그인 X → 그냥 auth UI 렌더
  if (authError || !user) {
    return <AuthFrame>{children}</AuthFrame>
  }

  // 3. 로그인 O + 이메일 미인증 → auth 흐름(verify-email 등) 보여줘야 함 (리다이렉트 금지)
  const emailConfirmed = user.email_confirmed_at ?? (user as { confirmed_at?: string }).confirmed_at
  if (!emailConfirmed) {
    console.log('[AuthLayout] User logged in but email not confirmed, showing auth pages')
    return <AuthFrame>{children}</AuthFrame>
  }

  // 4. 이메일 인증 완료 → 온보딩 단계 따라 이동
  console.log('[AuthLayout] User logged in with confirmed email, checking onboarding stage')

  const stageResult = await checkOnboardingStage()

  // 온보딩 체크 실패 시 pending 페이지로 (에러 메시지와 함께)
  if (!stageResult.success || !stageResult.data) {
    console.warn('[AuthLayout] Onboarding stage check failed, redirecting to pending:', {
      error: stageResult.error,
    })
    redirect('/auth/pending?error=onboarding_check_failed&message=' + encodeURIComponent(stageResult.error || '온보딩 상태 확인에 실패했습니다'))
  }

  const stageData = stageResult.data as {
    ok: boolean
    stage?: { code: string; next_url?: string }
  }

  const { code: stageCode, next_url: nextUrl } = stageData.stage || {}

  const redirectUrl =
    nextUrl ||
    (stageCode === 'READY' ? '/dashboard' : '/auth/pending')

  console.log('[AuthLayout] Redirecting confirmed user to:', redirectUrl)
  redirect(redirectUrl)
}
