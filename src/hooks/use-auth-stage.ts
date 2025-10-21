/**
 * 인증 단계 관리를 위한 커스텀 훅
 *
 * 로딩 상태, 에러 처리, 재시도 로직을 통합 관리
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authStageService } from '@/infrastructure/auth/auth-stage.service'
import { AuthStageError, getAuthStageErrorMessage } from '@/lib/auth/auth-errors'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'
import { useToast } from './use-toast'

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
  const [error, setError] = useState<AuthStageError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  /**
   * 프로필 생성
   */
  const createProfile = useCallback(async (): Promise<boolean> => {
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
      const { data, error: createError } = await authStageService.createUserProfile()

      if (createError || !data?.ok) {
        setError(createError!)
        setRetryCount((prev) => prev + 1)
        const errorInfo = getAuthStageErrorMessage(createError!)

        // 재시도 가능 여부 메시지 추가
        const remainingRetries = maxRetries - retryCount - 1
        const description = remainingRetries > 0
          ? `${errorInfo.description} (${remainingRetries}번 재시도 가능)`
          : errorInfo.description

        toast({
          title: errorMessage?.title || errorInfo.title,
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
        const { data: stageData, error: stageError } = await authStageService.getAuthStage(
          inviteToken ?? undefined
        )

        if (stageError || !stageData?.ok) {
          console.error('[useAuthStage] Stage check failed after profile creation:', stageError)
          router.push('/auth/login')
          return false
        }

        const { next_url } = stageData.stage || {}
        router.push(next_url || '/dashboard')
      }

      return true
    } catch (err) {
      console.error('[useAuthStage] createProfile error:', err)
      setError(err as AuthStageError)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [router, toast, autoRoute, successMessage, errorMessage, retryCount, maxRetries])

  /**
   * 원장 설정 완료
   */
  const finishOwnerSetup = useCallback(
    async (params: {
      academyName: string
      timezone?: string
      settings?: Record<string, unknown>
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
        const { data, error: setupError } = await authStageService.ownerFinishSetup(params)

        if (setupError || !data?.ok) {
          setError(setupError!)
          setRetryCount((prev) => prev + 1)
          const errorInfo = getAuthStageErrorMessage(setupError!)

          const remainingRetries = maxRetries - retryCount - 1
          const description = remainingRetries > 0
            ? `${errorInfo.description} (${remainingRetries}번 재시도 가능)`
            : errorInfo.description

          toast({
            title: errorMessage?.title || errorInfo.title,
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
        setError(err as AuthStageError)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [router, toast, autoRoute, successMessage, errorMessage, retryCount, maxRetries]
  )

  /**
   * 직원 초대 수락
   */
  const acceptInvite = useCallback(
    async (token: string): Promise<boolean> => {
      // 최대 재시도 횟수 체크
      if (retryCount >= maxRetries) {
        toast({
          title: '재시도 횟수 초과',
          description: `최대 ${maxRetries}번까지만 재시도할 수 있습니다. 초대 링크가 유효한지 확인하거나 관리자에게 문의해주세요.`,
          variant: 'destructive',
        })
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const { data, error: acceptError } = await authStageService.acceptStaffInvite(token)

        if (acceptError || !data?.ok) {
          setError(acceptError!)
          setRetryCount((prev) => prev + 1)
          const errorInfo = getAuthStageErrorMessage(acceptError!)

          const remainingRetries = maxRetries - retryCount - 1
          const description = remainingRetries > 0 && errorInfo.canRetry
            ? `${errorInfo.description} (${remainingRetries}번 재시도 가능)`
            : errorInfo.description

          toast({
            title: errorMessage?.title || errorInfo.title,
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

        // 토큰 제거
        inviteTokenStore.remove()

        // 자동 라우팅
        if (autoRoute) {
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        }

        return true
      } catch (err) {
        console.error('[useAuthStage] acceptInvite error:', err)
        setError(err as AuthStageError)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [router, toast, autoRoute, successMessage, errorMessage, retryCount, maxRetries]
  )

  /**
   * 인증 단계 확인 및 라우팅
   */
  const checkAndRoute = useCallback(
    async (inviteToken?: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: stageError } = await authStageService.getAuthStage(inviteToken)

        if (stageError || !data?.ok) {
          setError(stageError!)
          console.error('[useAuthStage] checkAndRoute error:', stageError)
          router.push('/auth/login')
          return false
        }

        const { code, next_url } = data.stage || {}

        console.log(`[useAuthStage] Auth stage: ${code}, next_url: ${next_url || '/dashboard'}`)

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
        setError(err as AuthStageError)
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
