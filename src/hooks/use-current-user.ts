/**
 * useCurrentUser Hook
 *
 * Client-side hook to get current authenticated user information
 * Uses Supabase client (with RLS) for safe client-side queries
 *
 * @example
 * const { user, tenant, isLoading, error } = useCurrentUser()
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // 1. Get authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        setUser(null)
        setIsLoading(false)
        return
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
        setUser(null)
        setIsLoading(false)
        return
      }

      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        tenantId: userData.tenant_id || '',
        roleCode: userData.role_code || '',
        approvalStatus: userData.approval_status,
        onboardingCompleted: userData.onboarding_completed,
      })
    } catch (err) {
      console.error('[useCurrentUser] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return {
    user,
    isLoading,
    loading: isLoading,  // Alias for backward compatibility
    error,
    refetch: fetchUser,
  }
}
