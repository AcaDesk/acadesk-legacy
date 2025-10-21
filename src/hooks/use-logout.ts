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
import { logout as logoutAction } from '@/app/actions/logout'
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

      // 성공 콜백 실행
      if (onSuccess) {
        onSuccess()
      }

      // Server Action 호출 (리다이렉트 발생)
      await logoutAction()
    } catch (error) {
      console.error('[useLogout] Logout error:', error)
      setIsLoading(false)

      // 에러 콜백 실행
      if (onError && error instanceof Error) {
        onError(error)
      }

      // Server Action의 redirect가 에러로 처리될 수 있으므로
      // redirect 에러는 무시하고 진행
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // Next.js redirect는 정상 동작
        return
      }
    }
  }, [onBeforeLogout, onSuccess, onError])

  return {
    logout,
    isLoading,
  }
}
