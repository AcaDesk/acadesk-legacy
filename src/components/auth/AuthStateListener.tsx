/**
 * AuthStateListener
 *
 * onAuthStateChange 리스너 - 이메일 인증 등 세션 변경 감지
 * - SIGNED_IN 이벤트 발생 시 routeAfterLogin 호출
 * - 루트 레이아웃에서 사용
 */

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { routeAfterLogin } from '@/lib/auth/route-after-login'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'

export function AuthStateListener() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthStateListener] Auth event:', event)

        // SIGNED_IN 이벤트만 처리 (이메일 인증 완료, 소셜 로그인 등)
        if (event === 'SIGNED_IN' && session) {
          // 이미 인증 관련 페이지에 있으면 routeAfterLogin 실행
          // (로그인, 인증 페이지에서만)
          const isAuthPage =
            pathname.startsWith('/auth/login') ||
            pathname.startsWith('/auth/verify-email') ||
            pathname.startsWith('/auth/callback')

          if (isAuthPage) {
            console.log('[AuthStateListener] Routing after login...')
            const inviteToken = inviteTokenStore.get()
            await routeAfterLogin(router, inviteToken ?? undefined)
          }
        }
      }
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [router, pathname, supabase.auth])

  return null
}
