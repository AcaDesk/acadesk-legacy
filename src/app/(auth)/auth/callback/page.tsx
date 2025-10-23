/**
 * Auth Callback Page (Client Component)
 *
 * 이메일 인증 링크 클릭 후 코드 교환을 클라이언트에서 수행
 * - 메일 보안 스캐너가 JS를 실행하지 않으므로 코드 소모 방지
 * - 인앱 웹뷰 환경에서도 더 안정적
 *
 * 기존 서버 라우트에서 클라이언트 페이지로 이관 (2025-10-23)
 * 이유: Gmail/Outlook 등의 링크 사전 스캔으로 코드가 조기 소모되는 문제 해결
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authStageService } from '@/infrastructure/auth/auth-stage.service'
import { createUserProfileServer } from '@/app/actions/onboarding'

/**
 * Supabase 인증 에러를 분석하여 적절한 에러 타입을 반환
 */
function classifyAuthError(error: { message?: string; code?: string }): string {
  const m = error.message?.toLowerCase() || ''
  const c = error.code?.toLowerCase() || ''

  if (m.includes('expired') || c.includes('expired')) return 'expired'
  if (m.includes('already') || m.includes('used') || c.includes('consumed')) return 'used'
  if (m.includes('invalid') || c.includes('invalid') || m.includes('not found')) return 'invalid'
  if (m.includes('rate limit') || m.includes('too many')) return 'rate_limit'
  if (m.includes('provider') || c.includes('provider')) return 'provider_error'

  return 'unknown'
}

export default function CallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const code = searchParams.get('code')
    const type = (searchParams.get('type') || 'signup').toLowerCase()
    const requestId = crypto.randomUUID()

    console.log('[auth/callback] Client callback started:', {
      requestId,
      hasCode: !!code,
      type,
      timestamp: new Date().toISOString(),
    })

    // 코드가 없으면 로그인으로
    if (!code) {
      console.warn('[auth/callback] Missing code param', { requestId })
      router.replace('/auth/login')
      return
    }

    // 코드 교환 및 온보딩 처리
    handleCallback(code, type, requestId)
  }, []) // 빈 배열: 마운트 시 한 번만 실행

  async function handleCallback(code: string, type: string, requestId: string) {
    try {
      const supabase = createClient()

      // ✅ Step 1: 세션 교환 (클라이언트에서 수행 → 스캐너 무력화)
      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeErr) {
        console.error('[auth/callback] Session exchange failed:', {
          requestId,
          message: exchangeErr.message,
          status: exchangeErr.status,
          code: exchangeErr.code,
          name: exchangeErr.name,
        })
        const errType = classifyAuthError(exchangeErr)
        router.replace(`/auth/link-expired?type=${type}&error=${errType}`)
        setStatus('error')
        setErrorMessage(exchangeErr.message)
        return
      }

      console.log('[auth/callback] Session exchange success', { requestId })

      // ✅ Step 2: 현재 사용자 조회
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('[auth/callback] No user after session exchange', { requestId })
        router.replace('/auth/login')
        setStatus('error')
        return
      }

      const userId = user.id
      const userEmail = user.email || ''

      console.log('[auth/callback] User retrieved:', { requestId, userId, email: userEmail })

      // ✅ Step 3: 이메일 인증 확인
      const emailConfirmedAt = user.email_confirmed_at ?? (user as any).confirmed_at

      if (!emailConfirmedAt) {
        console.warn('[auth/callback] Email not confirmed yet', { requestId, userId })
        router.replace(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`)
        return
      }

      // ✅ Step 4: 자동 프로필 생성 (Server Action 사용)
      try {
        const profileResult = await createUserProfileServer(userId)

        if (!profileResult.success) {
          console.error('[auth/callback] Profile creation failed:', {
            requestId,
            userId,
            error: profileResult.error,
          })
          router.replace('/auth/pending?error=profile_creation_failed')
          return
        }

        console.log('[auth/callback] Profile created/verified:', { requestId, userId })
      } catch (error) {
        console.error('[auth/callback] Profile creation exception:', {
          requestId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
        router.replace('/auth/pending?error=profile_creation_error')
        return
      }

      // ✅ Step 5: 온보딩 상태 확인 후 적절한 페이지로 리다이렉트
      try {
        const { data: stageData, error: stageError } = await authStageService.getAuthStage()

        if (stageError || !stageData?.ok || !stageData.stage) {
          console.error('[auth/callback] get_auth_stage failed:', {
            requestId,
            userId,
            error: stageError,
          })
          // Stage 확인 실패 시 로그인 페이지로 (클라이언트에서 다시 확인)
          const params = new URLSearchParams({ verified: 'true' })
          if (userEmail) {
            params.set('email', userEmail)
          }
          router.replace(`/auth/login?${params.toString()}`)
          return
        }

        const { code: stageCode, next_url: nextUrl } = stageData.stage

        console.log('[auth/callback] Auth stage determined:', {
          requestId,
          userId,
          stageCode,
          nextUrl: nextUrl || 'none',
        })

        // 온보딩 상태에 따라 리다이렉트
        if (nextUrl) {
          router.replace(nextUrl)
        } else if (stageCode === 'READY') {
          router.replace('/dashboard')
        } else {
          // 예상치 못한 상태 → 로그인으로
          const params = new URLSearchParams({ verified: 'true' })
          if (userEmail) {
            params.set('email', userEmail)
          }
          router.replace(`/auth/login?${params.toString()}`)
        }

        setStatus('success')
      } catch (error) {
        console.error('[auth/callback] Stage check exception:', {
          requestId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
        const params = new URLSearchParams({ verified: 'true' })
        if (userEmail) {
          params.set('email', userEmail)
        }
        router.replace(`/auth/login?${params.toString()}`)
      }
    } catch (error) {
      console.error('[auth/callback] Unexpected error:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
      router.replace('/auth/login')
      setStatus('error')
    }
  }

  // 로딩 상태 표시
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">인증 처리 중</h2>
          <p className="text-sm text-muted-foreground">
            이메일 인증을 완료하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
        {status === 'error' && errorMessage && (
          <p className="text-sm text-destructive mt-4">
            오류가 발생했습니다. 잠시 후 자동으로 이동합니다.
          </p>
        )}
      </div>
    </div>
  )
}
