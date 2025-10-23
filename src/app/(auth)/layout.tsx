/**
 * Auth Layout (Server Component)
 *
 * 인증 관련 페이지(/auth/*)의 레이아웃
 *
 * ✅ 역할:
 * - 이미 로그인된 사용자는 서버에서 바로 리다이렉트
 * - 온보딩 상태에 따라 적절한 페이지로 이동
 * - 인증 페이지 공통 UI 제공 (로고, 배경)
 *
 * 이렇게 하면:
 * - "로그인했는데 로그인 페이지가 그대로" 문제 해결
 * - 세션 갱신 타이밍 이슈 방지
 * - 깔끔한 UX
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkOnboardingStage } from '@/app/actions/onboarding'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. 현재 사용자 세션 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 2. 로그인되어 있으면 온보딩 상태 확인 후 적절한 곳으로 리다이렉트
  if (!authError && user) {
    console.log('[AuthLayout] User is logged in, checking onboarding stage')

    const stageResult = await checkOnboardingStage()

    if (stageResult.success && stageResult.data) {
      const stageData = stageResult.data as {
        ok: boolean
        stage?: { code: string; next_url?: string }
      }

      const { code: stageCode, next_url: nextUrl } = stageData.stage || {}

      const redirectUrl =
        nextUrl ||
        (stageCode === 'READY' ? '/dashboard' : '/auth/pending')

      console.log('[AuthLayout] Redirecting logged-in user to:', redirectUrl)
      redirect(redirectUrl)
    } else {
      // 온보딩 상태 확인 실패 시 기본적으로 대시보드로
      console.warn('[AuthLayout] Onboarding stage check failed, redirecting to dashboard')
      redirect('/dashboard')
    }
  }

  // 3. 로그인되어 있지 않으면 인증 페이지 표시 (공통 UI)
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
