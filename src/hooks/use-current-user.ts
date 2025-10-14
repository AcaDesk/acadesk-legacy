/**
 * Custom hook to get current user and tenant information
 * Uses RPC function to bypass RLS restrictions during onboarding
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingStateResponse } from '@/types/auth.types'

interface CurrentUser {
  id: string
  tenantId: string
  email: string | null
  name: string
  roleCode: string | null
  onboardingCompleted: boolean
  approvalStatus: 'pending' | 'approved' | 'rejected'
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get auth user first
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!authUser) throw new Error('Not authenticated')

      // Use RPC function to get onboarding state (bypasses RLS)
      const { data: state, error: rpcError } = await supabase
        .rpc('get_onboarding_state')
        .single()

      if (rpcError) {
        console.error('Error fetching onboarding state:', rpcError)
        throw new Error(`Failed to fetch user state: ${rpcError.message}`)
      }

      const onboardingState = state as OnboardingStateResponse

      // Check if user exists in public.users (trigger should have created it)
      if (!onboardingState.app_user_exists) {
        throw new Error('User not found in database. Please contact support.')
      }

      // For dashboard access, require onboarding completion
      if (!onboardingState.onboarding_completed) {
        throw new Error('Onboarding not completed')
      }

      if (!onboardingState.tenant_id) {
        throw new Error('User has no tenant_id')
      }

      setUser({
        id: onboardingState.auth_user_id,
        tenantId: onboardingState.tenant_id,
        email: authUser.email || null,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        roleCode: onboardingState.role_code,
        onboardingCompleted: onboardingState.onboarding_completed,
        approvalStatus: onboardingState.approval_status,
      })
    } catch (err) {
      console.error('Error in useCurrentUser:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  }
}
