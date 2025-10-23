/**
 * Logout Hook
 *
 * 로그아웃 처리와 클라이언트 사이드 정리 작업을 담당
 * - Server Action 호출 (세션 종료)
 * - localStorage 정리 (초대 토큰 등)
 * - 로딩 상태 관리
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'

interface UseLogoutOptions {
  /** 로그아웃 전 실행할 콜백 */
  onBeforeLogout?: () => void | Promise<void>
  /** 로그아웃 성공 시 실행할 콜백 (리다이렉트 전) */
  onSuccess?: () => void
  /** 에러 발생 시 실행할 콜백 */
  onError?: (error: Error) => void
}

export function useLogout(options: UseLogoutOptions = {}) {
  const { onBeforeLogout, onSuccess, onError } = options
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const logout = useCallback(async () => {
    try {
      setIsLoading(true)

      // 로그아웃 전 콜백 실행
      if (onBeforeLogout) {
        await onBeforeLogout()
      }

      // localStorage 정리
      inviteTokenStore.remove()

      // 다른 localStorage 항목이 있다면 여기서 정리
      // 예: localStorage.removeItem('someOtherKey')

      console.log('[useLogout] Client-side cleanup completed')

      // Server Action 호출
      const result = await signOut()

      if (!result.success) {
        throw new Error(result.error || '로그아웃에 실패했습니다')
      }

      // 성공 콜백 실행
      if (onSuccess) {
        onSuccess()
      }

      console.log('[useLogout] Logout successful, redirecting to /auth/login')

      // 로그인 페이지로 리다이렉트
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('[useLogout] Logout error:', error)
      setIsLoading(false)

      // 에러 콜백 실행
      if (onError && error instanceof Error) {
        onError(error)
      }

      // 에러가 발생해도 로그인 페이지로 이동 (세션이 이미 만료되었을 수 있음)
      router.push('/auth/login')
    }
  }, [onBeforeLogout, onSuccess, onError, router])

  return {
    logout,
    isLoading,
  }
}
