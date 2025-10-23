import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@ui/button'

// Edge 런타임 방지 - service_role은 Node.js에서만 작동
export const runtime = 'nodejs'

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Dashboard Layout (Server Component)
 *
 * ✅ 역할:
 * - 인증 체크 (세션만 일반 클라이언트로)
 * - 모든 DB 쿼리는 service_role로 (RLS 우회)
 * - Tenant 정보 확인
 * - 사용자 정보 조회
 *
 * ❌ 하지 않음:
 * - UI 상태 관리 (사이드바, 모바일 메뉴 등)
 * - 클라이언트 애니메이션
 *
 * 무한 루프 방지:
 * - DB 조회 실패 시 에러 화면 렌더 (redirect 금지)
 * - 모든 DB 쿼리는 service_role로만
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()

  // 1. 세션 확인만 일반 클라이언트로 (DB 쿼리 아님)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. 이메일 인증 체크
  const emailConfirmed = user.email_confirmed_at ?? (user as { confirmed_at?: string }).confirmed_at
  if (!emailConfirmed) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : ''
    redirect(`/auth/verify-email${q}`)
  }

  // 3. 모든 DB 조회는 service_role로만 (RLS 우회)
  const admin = createServiceRoleClient()
  const { data: userData, error: userError } = await admin
    .from('users')
    .select('tenant_id, role_code, name, email, phone')
    .eq('id', user.id)
    .maybeSingle()

  // 4. DB 조회 에러 → pending 페이지로 (에러 안내)
  if (userError) {
    const postgrestError = userError as { code?: string; message?: string }
    console.error('[DashboardLayout] Error fetching user data:', {
      error: userError,
      userId: user.id,
      errorCode: postgrestError.code,
    })
    const errorCode = postgrestError.code || 'unknown'
    const errorMessage = userError.message || '프로필 조회 중 오류가 발생했습니다'
    redirect(`/auth/pending?error=profile_query_failed&code=${errorCode}&message=${encodeURIComponent(errorMessage)}`)
  }

  // 5. 프로필 없음 → 부트스트랩 페이지로 (프로필 생성)
  if (!userData) {
    console.warn('[DashboardLayout] User profile not found, redirecting to bootstrap:', {
      userId: user.id,
    })
    redirect('/auth/bootstrap?from=dashboard&message=' + encodeURIComponent('프로필 정보를 생성해주세요'))
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

  // 6. 모든 체크 완료 - UI 셸로 전달
  return (
    <DashboardShell
      userName={userData.name || undefined}
      userEmail={userData.email || user.email || undefined}
    >
      {children}
    </DashboardShell>
  )
}
