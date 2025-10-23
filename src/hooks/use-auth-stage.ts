/**
 * useAuthStage Hook
 *
 * Client-side hook to check authentication stage
 * Calls checkOnboardingStage Server Action
 *
 * @example
 * const { stage, isLoading, error } = useAuthStage({ inviteToken })
 */

'use client'

import { useEffect, useState } from 'react'
import { checkOnboardingStage } from '@/app/actions/onboarding'

export interface AuthStage {
  code: string
  next_url?: string
}

export interface UseAuthStageOptions {
  inviteToken?: string
  autoRoute?: boolean
  successMessage?: {
    title: string
    description: string
  }
}

export interface UseAuthStageReturn {
  stage: AuthStage | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  acceptInvite: (token: string) => Promise<void>  // TODO: Implement with Server Action
}

export function useAuthStage(options?: UseAuthStageOptions): UseAuthStageReturn {
  const [stage, setStage] = useState<AuthStage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStage = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await checkOnboardingStage(options?.inviteToken)

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to check auth stage')
        setStage(null)
        return
      }

      const stageData = result.data as { ok: boolean; stage?: AuthStage }

      if (!stageData.ok || !stageData.stage) {
        setError('Invalid stage data')
        setStage(null)
        return
      }

      setStage(stageData.stage)
    } catch (err) {
      console.error('[useAuthStage] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStage(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStage()
  }, [options?.inviteToken])

  // TODO: Implement invite acceptance with Server Action
  const acceptInvite = async (token: string) => {
    console.warn('[useAuthStage] acceptInvite not yet implemented with service_role')
    // This should call a Server Action that uses service_role
    // For now, just a stub to satisfy TypeScript
  }

  return {
    stage,
    isLoading,
    error,
    refetch: fetchStage,
    acceptInvite,
  }
}
