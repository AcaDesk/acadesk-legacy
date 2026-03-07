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

import { useEffect, useState, useCallback } from 'react'
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

  const fetchStage = useCallback(async () => {
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
  }, [options?.inviteToken])

  useEffect(() => {
    fetchStage()
  }, [fetchStage])

  // TODO: Implement invite acceptance with Server Action (별도 PR - staff_invites 스키마 확인 필요)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const acceptInvite = async (_token: string) => {
    throw new Error('초대 수락 기능은 아직 구현되지 않았습니다. 관리자에게 문의해주세요.')
  }

  return {
    stage,
    isLoading,
    error,
    refetch: fetchStage,
    acceptInvite,
  }
}
