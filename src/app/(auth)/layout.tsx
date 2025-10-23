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
 * - pathname 헤더가 없으면 절대 redirect하지 않음
 * - 현재 경로 == 목적지 경로면 children 렌더
 * - 경로 비교는 정규화(소문자 + 끝 슬래시 제거 + 쿼리 제거)
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

/**
 * 경로 정규화: 소문자 + 쿼리 제거 + 끝 슬래시 제거
 */
const normalizePath = (p: string) =>
  p.toLowerCase().replace(/\?.*$/, '').replace(/\/+$/, '') || '/'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 0. 현재 경로 확인 (미들웨어가 요청 헤더에 넣어줌)
  const headersList = await headers()
  const rawPath = headersList.get('x-pathname') ?? ''
  const pathname = normalizePath(rawPath)

  // ★ 헤더가 안 들어오면 절대 redirect하지 말고 렌더 (루프 방지)
  const pathMissing = !rawPath

  // 1. 현재 사용자 세션 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 2. 로그인 X → auth UI 렌더
  if (authError || !user) {
    return <AuthFrame>{children}</AuthFrame>
  }

  // 3. 로그인 O + 이메일 미인증 → auth 흐름(verify-email 등) 보여줌
  const emailConfirmed = user.email_confirmed_at ?? (user as { confirmed_at?: string }).confirmed_at
  if (!emailConfirmed) {
    console.log('[AuthLayout] User logged in but email not confirmed, showing auth pages')
    return <AuthFrame>{children}</AuthFrame>
  }

  // 4. 이메일 인증 완료 → 온보딩 단계 확인
  console.log('[AuthLayout] User logged in with confirmed email, checking onboarding stage')

  const stageResult = await checkOnboardingStage()

  // 온보딩 체크 실패 시 children 렌더 (루프 방지)
  if (!stageResult.success || !stageResult.data) {
    console.warn('[AuthLayout] Onboarding stage check failed, rendering children:', {
      error: stageResult.error,
    })
    return <AuthFrame>{children}</AuthFrame>
  }

  const stage = stageResult.data.stage
  const stageCode = stage?.code
  const nextUrl = stage?.next_url
  const target = normalizePath(
    nextUrl ?? (stageCode === 'READY' ? '/dashboard' : '/auth/pending')
  )

  // ★ 루프 방지 1: 현재 경로 == 목적지면 렌더
  if (pathname === target) {
    console.log('[AuthLayout] Already on target page, rendering children:', pathname)
    return <AuthFrame>{children}</AuthFrame>
  }

  // ★ 루프 방지 2: 경로 헤더가 없으면 렌더
  if (pathMissing) {
    console.log('[AuthLayout] Path header missing, rendering children to prevent loop')
    return <AuthFrame>{children}</AuthFrame>
  }

  // ★ 루프 방지 3: NO_PROFILE인데 현재 /auth/bootstrap이면 렌더
  if (stageCode === 'NO_PROFILE' && pathname === normalizePath('/auth/bootstrap')) {
    console.log('[AuthLayout] NO_PROFILE stage on bootstrap page, rendering children')
    return <AuthFrame>{children}</AuthFrame>
  }

  console.log('[AuthLayout] Redirecting confirmed user to:', target)
  redirect(target)
}
