import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayoutClient } from './layout.client'
import { Loader2 } from 'lucide-react'
import { Button } from '@ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Dashboard Layout (Server Component)
 *
 * ✅ 역할:
 * - 인증 체크 (SSR에서 즉시 리다이렉트)
 * - 온보딩 상태 체크
 * - Tenant 정보 확인
 * - 사용자 정보 조회
 *
 * ❌ 하지 않음:
 * - UI 상태 관리 (사이드바, 모바일 메뉴 등)
 * - 클라이언트 애니메이션
 *
 * UI 상태는 DashboardLayoutClient로 위임
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()

  // 1. 인증 체크 (SSR에서 바로 리다이렉트 - 깜빡임 없음)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. 이메일 인증 체크
  if (!user.email_confirmed_at) {
    const searchParams = new URLSearchParams()
    if (user.email) {
      searchParams.set('email', user.email)
    }
    redirect(`/auth/verify-email?${searchParams.toString()}`)
  }

  // 3. 사용자 프로필 조회 (tenant_id, role, onboarding)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id, role_code, name, email, phone')
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userData) {
    console.error('[DashboardLayout] Error fetching user data:', userError)
    // 프로필 없음 - 로그인으로 리다이렉트 (재인증 필요)
    redirect('/auth/login')
  }

  // 4. Tenant 체크 - tenant_id 없으면 안내 화면
  if (!userData.tenant_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              계정 설정이 완료되지 않았습니다
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              관리자가 계정 설정을 완료하는 중입니다. 잠시 후 다시 시도해 주세요.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              문제가 지속되면 관리자에게 문의하세요.
            </p>
          </div>
          <form action="/auth/logout" method="POST">
            <Button
              type="submit"
              variant="outline"
              className="w-full"
            >
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // 5. 온보딩 체크 (선택적 - 필요시 활성화)
  // Note: 온보딩 완료 여부를 확인하려면 users 테이블에 onboarding_completed 컬럼 필요
  // if (!userData.onboarding_completed) {
  //   redirect('/auth/bootstrap')
  // }

  // 6. 모든 체크 완료 - 클라이언트 컴포넌트로 전달
  return (
    <DashboardLayoutClient
      userName={userData.name || undefined}
      userEmail={userData.email || user.email || undefined}
    >
      {children}
    </DashboardLayoutClient>
  )
}
