/**
 * Custom hook to get current user and tenant information
 * Safe to use in any component (public/protected routes)
 * Does not throw errors - returns null for unauthenticated users
 */

import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CurrentUser {
  id: string
  email: string
  name: string
  roleCode: string | null
  tenantId: string | null
  onboardingCompleted: boolean
  approvalStatus: 'pending' | 'approved' | 'rejected'
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useCurrentUser(): UseCurrentUserResult {
  const pathname = usePathname()

  // 공개 경로 확인 (로그인/회원가입/온보딩 등)
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding')

  const supabase = createClient()

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['current-user', { route: isPublicRoute ? 'public' : 'protected' }],
    enabled: true, // 어디서든 안전하게 호출 가능
    retry: 0, // 재시도 없음 (불필요한 로그 방지)
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    queryFn: async (): Promise<CurrentUser | null> => {
      try {
        // 1. 인증 확인
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        // 로그인 안 한 상태면 조용히 null 반환
        if (authError || !authUser) {
          console.log('useCurrentUser: No authenticated user')
          return null
        }

        // 2. users 레코드 조회 (RLS 통과)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, name, role_code, tenant_id, onboarding_completed, approval_status')
          .eq('id', authUser.id)
          .maybeSingle()

        // 3. users 레코드가 없거나 에러 → null 반환 (프로필 생성은 Server Action에서)
        // ✅ 클라이언트에서 RPC 호출하지 않음
        if (userError || !userData) {
          console.warn('useCurrentUser: User record not found, user should be redirected to /auth/bootstrap')
          return null
        }

        // 4. snake_case → camelCase 변환
        return {
          id: userData.id,
          email: userData.email ?? '',
          name: userData.name ?? '',
          roleCode: userData.role_code,
          tenantId: userData.tenant_id,
          onboardingCompleted: userData.onboarding_completed ?? false,
          approvalStatus: userData.approval_status ?? 'pending',
        }
      } catch (err) {
        // 예상치 못한 에러도 조용히 처리
        console.error('useCurrentUser: Unexpected error', err)
        return null
      }
    },
  })

  return {
    user: user ?? null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}
