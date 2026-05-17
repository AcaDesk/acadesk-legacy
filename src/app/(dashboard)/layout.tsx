import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { LogoutButton } from '@/components/auth/LogoutButton'

// Edge 런타임 방지 - service_role은 Node.js에서만 작동
export const runtime = 'nodejs'

/**
 * 사용자 프로필 조회 (캐시: 5분 TTL, user:${userId} 태그)
 *
 * Dashboard 하위 페이지마다 호출되는 layout이 매번 users 테이블을 조회하던 패턴을 캐싱.
 * 프로필/승인 상태가 변경되면 해당 mutation에서 revalidateTag(`user:${userId}`)로 무효화 필요.
 */
const getCachedUserProfile = (userId: string) =>
  unstable_cache(
    async () => {
      const admin = createServiceRoleClient()
      const { data, error } = await admin
        .from('users')
        .select('tenant_id, role_code, name, email, phone, approval_status, onboarding_completed')
        .eq('id', userId)
        .maybeSingle()
      return { data, error }
    },
    ['user-profile', userId],
    { revalidate: 300, tags: [`user:${userId}`] }
  )()

const getCachedTenantName = (tenantId: string) =>
  unstable_cache(
    async () => {
      const admin = createServiceRoleClient()
      const { data, error } = await admin
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .maybeSingle()
      return { data, error }
    },
    ['tenant-name', tenantId],
    { revalidate: 3600, tags: [`academy:${tenantId}`] }
  )()

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

  // 3. 모든 DB 조회는 service_role로만 (RLS 우회) — 5분 캐시
  const { data: userData, error: userError } = await getCachedUserProfile(user.id)

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

  // 4. Tenant 체크 - tenant_id 없으면 온보딩 단계에 맞게 리다이렉트
  if (!userData.tenant_id) {
    // 승인 대기 중 (role_code 없음) → pending 페이지
    if (userData.approval_status === 'pending' && !userData.role_code) {
      redirect('/auth/pending')
    }
    // 승인 거부됨 → pending 페이지 (거부 상태 표시)
    if (userData.approval_status === 'rejected') {
      redirect('/auth/pending?status=rejected')
    }
    // owner지만 온보딩 미완료 → 학원 설정 페이지
    if (userData.role_code === 'owner' && !userData.onboarding_completed) {
      redirect('/auth/owner/setup')
    }
    // 그 외 예외 케이스 → 로그아웃 가능한 안내 화면
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              소속된 학원이 없습니다
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              학원 관리자로부터 초대 링크를 받으셨다면, 해당 링크로 다시 접속해 주세요.
            </p>
            <p className="text-xs text-muted-foreground">
              계정: {userData.email || user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    )
  }

  let tenantName: string | undefined
  const { data: tenantData, error: tenantError } = await getCachedTenantName(userData.tenant_id)

  if (tenantError) {
    console.warn('[DashboardLayout] Failed to fetch tenant name:', {
      error: tenantError,
      tenantId: userData.tenant_id,
      userId: user.id,
    })
  } else {
    tenantName = tenantData?.name || undefined
  }

  const userMetadata = user.user_metadata as Record<string, unknown> | undefined
  const avatarFromMetadata =
    typeof userMetadata?.avatar_url === 'string'
      ? userMetadata.avatar_url
      : typeof userMetadata?.picture === 'string'
        ? userMetadata.picture
        : undefined

  // 6. 모든 체크 완료 - UI 셸로 전달
  return (
    <DashboardShell
      userName={userData.name || undefined}
      userEmail={userData.email || user.email || undefined}
      userRole={userData.role_code || undefined}
      userTenantName={tenantName}
      userAvatarUrl={avatarFromMetadata}
    >
      {children}
    </DashboardShell>
  )
}
