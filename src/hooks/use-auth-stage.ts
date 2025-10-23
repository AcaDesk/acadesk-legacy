/**
 * 인증 단계 관리를 위한 커스텀 훅
 *
 * ✅ 완전히 Server Action 기반으로 마이그레이션됨 (RPC 제거)
 *
 * 로딩 상태, 에러 처리, 재시도 로직을 통합 관리
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'
import { useToast } from './use-toast'
import {
  createUserProfileServer,
  completeOwnerOnboarding,
  checkOnboardingStage,
} from '@/app/actions/onboarding'

interface UseAuthStageOptions {
  /** 자동 라우팅 활성화 여부 (기본: true) */
  autoRoute?: boolean
  /** 성공 시 표시할 토스트 메시지 */
  successMessage?: { title: string; description: string }
  /** 실패 시 표시할 토스트 메시지 (기본: 에러 메시지 사용) */
  errorMessage?: { title: string; description: string }
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number
}

export function useAuthStage(options: UseAuthStageOptions = {}) {
  const { autoRoute = true, successMessage, errorMessage, maxRetries = 3 } = options
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  /**
   * 프로필 생성 (Server Action 사용)
   */
  const createProfile = useCallback(
    async (userId: string): Promise<boolean> => {
      // 최대 재시도 횟수 체크
      if (retryCount >= maxRetries) {
        toast({
          title: '재시도 횟수 초과',
          description: `최대 ${maxRetries}번까지만 재시도할 수 있습니다. 잠시 후 다시 시도하거나 고객센터에 문의해주세요.`,
          variant: 'destructive',
        })
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await createUserProfileServer(userId)

        if (!result.success) {
          const err = new Error(result.error || '프로필 생성에 실패했습니다.')
          setError(err)
          setRetryCount((prev) => prev + 1)

          const remainingRetries = maxRetries - retryCount - 1
          const description =
            remainingRetries > 0
              ? `${result.error} (${remainingRetries}번 재시도 가능)`
              : result.error || '프로필 생성에 실패했습니다.'

          toast({
            title: errorMessage?.title || '프로필 생성 실패',
            description: errorMessage?.description || description,
            variant: 'destructive',
          })

          return false
        }

        // 성공 시 재시도 카운트 초기화
        setRetryCount(0)

        if (successMessage) {
          toast({
            title: successMessage.title,
            description: successMessage.description,
          })
        }

        // 자동 라우팅
        if (autoRoute) {
          const inviteToken = inviteTokenStore.get()
          const stageResult = await checkOnboardingStage(inviteToken ?? undefined)

          if (!stageResult.success || !stageResult.data) {
            console.error('[useAuthStage] Stage check failed after profile creation')
            router.push('/auth/login')
            return false
          }

          const stageData = stageResult.data as {
            ok: boolean
            stage?: { code: string; next_url?: string }
          }

          const { next_url } = stageData.stage || {}
          router.push(next_url || '/dashboard')
        }

        return true
      } catch (err) {
        console.error('[useAuthStage] createProfile error:', err)
        setError(err as Error)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [router, toast, autoRoute, successMessage, errorMessage, retryCount, maxRetries]
  )

  /**
   * 원장 설정 완료 (Server Action 사용)
   */
  const finishOwnerSetup = useCallback(
    async (params: {
      academyName: string
      ownerName?: string
      timezone?: string
      settings?: {
        address?: string
        phone?: string
        businessHours?: {
          start: string
          end: string
        }
        subjects?: string[]
      }
    }): Promise<boolean> => {
      // 최대 재시도 횟수 체크
      if (retryCount >= maxRetries) {
        toast({
          title: '재시도 횟수 초과',
          description: `최대 ${maxRetries}번까지만 재시도할 수 있습니다. 입력 내용을 확인하거나 고객센터에 문의해주세요.`,
          variant: 'destructive',
        })
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await completeOwnerOnboarding({
          ...params,
          timezone: params.timezone || 'Asia/Seoul',
        })

        if (!result.success) {
          const err = new Error(result.error || '학원 설정에 실패했습니다.')
          setError(err)
          setRetryCount((prev) => prev + 1)

          const remainingRetries = maxRetries - retryCount - 1
          const description =
            remainingRetries > 0
              ? `${result.error} (${remainingRetries}번 재시도 가능)`
              : result.error || '학원 설정에 실패했습니다.'

          toast({
            title: errorMessage?.title || '학원 설정 실패',
            description: errorMessage?.description || description,
            variant: 'destructive',
          })

          return false
        }

        // 성공 시 재시도 카운트 초기화
        setRetryCount(0)

        if (successMessage) {
          toast({
            title: successMessage.title,
            description: successMessage.description,
          })
        }

        // 자동 라우팅
        if (autoRoute) {
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        }

        return true
      } catch (err) {
        console.error('[useAuthStage] finishOwnerSetup error:', err)
        setError(err as Error)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [router, toast, autoRoute, successMessage, errorMessage, retryCount, maxRetries]
  )

  /**
   * 직원 초대 수락
   *
   * ⚠️ TODO: Server Action 구현 필요
   * 현재는 placeholder로 에러 반환
   */
  const acceptInvite = useCallback(
    async (token: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // TODO: acceptStaffInvite Server Action 구현 필요
        console.error('[useAuthStage] acceptInvite not implemented yet')
        toast({
          title: '기능 미구현',
          description: '초대 수락 기능은 아직 구현되지 않았습니다.',
          variant: 'destructive',
        })

        return false
      } catch (err) {
        console.error('[useAuthStage] acceptInvite error:', err)
        setError(err as Error)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * 인증 단계 확인 및 라우팅 (Server Action 사용)
   */
  const checkAndRoute = useCallback(
    async (inviteToken?: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await checkOnboardingStage(inviteToken)

        if (!result.success || !result.data) {
          const err = new Error(result.error || '인증 상태 확인에 실패했습니다.')
          setError(err)
          console.error('[useAuthStage] checkAndRoute error:', result.error)
          router.push('/auth/login')
          return false
        }

        const stageData = result.data as {
          ok: boolean
          stage?: { code: string; next_url?: string }
        }

        const { code, next_url } = stageData.stage || {}

        console.log(
          `[useAuthStage] Auth stage: ${code}, next_url: ${next_url || '/dashboard'}`
        )

        // 상태별 라우팅
        if (next_url) {
          router.push(next_url)
        } else if (code === 'READY') {
          router.push('/dashboard')
        } else {
          // 예상치 못한 상태
          console.warn(`[useAuthStage] Unexpected stage code: ${code}`)
          router.push('/auth/login')
          return false
        }

        return true
      } catch (err) {
        console.error('[useAuthStage] checkAndRoute error:', err)
        setError(err as Error)
        router.push('/auth/login')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [router]
  )

  /**
   * 에러 및 재시도 카운트 초기화
   */
  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  return {
    isLoading,
    error,
    retryCount,
    maxRetries,
    createProfile,
    finishOwnerSetup,
    acceptInvite,
    checkAndRoute,
    clearError,
  }
}
