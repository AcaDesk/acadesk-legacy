/**
 * useCurrentUser Hook
 *
 * Client-side hook to get current authenticated user information
 * Uses Supabase client (with RLS) for safe client-side queries
 *
 * ✅ React Query 기반으로 리팩토링됨:
 * - 자동 캐싱 (5분)
 * - 백그라운드 refetch
 * - 에러 재시도
 *
 * @example
 * const { user, tenant, isLoading, error } = useCurrentUser()
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'

export interface CurrentUser {
  id: string
  email: string
  name: string
  tenantId: string
  roleCode: string
  approvalStatus: string
  onboardingCompleted: boolean
}

export interface UseCurrentUserReturn {
  user: CurrentUser | null
  isLoading: boolean
  loading: boolean  // Alias for isLoading (backward compatibility)
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Query key for current user
 * @deprecated queryKeys.currentUser() 사용 권장
 */
export const CURRENT_USER_QUERY_KEY = queryKeys.currentUser()

/**
 * Fetch current user from Supabase
 */
async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient()

  // 1. Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // 2. Get user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, name, tenant_id, role_code, approval_status, onboarding_completed')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (!userData) {
    return null
  }

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    tenantId: userData.tenant_id || '',
    roleCode: userData.role_code || '',
    approvalStatus: userData.approval_status,
    onboardingCompleted: userData.onboarding_completed,
  }
}

export function useCurrentUser(): UseCurrentUserReturn {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 30 * 60 * 1000,   // 30분간 가비지 컬렉션 대기
    refetchOnWindowFocus: true,
    retry: 1,
  })

  return {
    user: user ?? null,
    isLoading,
    loading: isLoading,  // Alias for backward compatibility
    error: error as Error | null,
    refetch: async () => { await refetch() },
  }
}
