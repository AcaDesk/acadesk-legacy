/**
 * Auth Callback Page (Client Component)
 *
 * 이메일 인증 링크 클릭 후 중간 랜딩 페이지를 표시하고,
 * 사용자가 버튼을 클릭해야만 코드 교환 수행
 *
 * ✅ 메일 스캐너 대응:
 * - 메일 스캐너가 링크를 방문해도 자동 실행 안 함
 * - 사용자 클릭 시에만 토큰 소비
 * - 스캐너는 JS를 실행하지 않으므로 버튼 클릭 불가
 *
 * 플로우:
 * 1. 사용자가 이메일 링크 클릭 → callback 페이지 도착
 * 2. 사용자가 "이메일 인증 완료하기" 버튼 클릭
 * 3. exchangeCodeForSession() 실행 (클라이언트)
 * 4. /auth/bootstrap으로 리다이렉트
 * 5. bootstrap 페이지에서 프로필 생성 및 온보딩 라우팅
 *
 * 변경 이력:
 * - 2025-10-23: 서버 라우트 → 클라이언트 페이지 (스캐너 1차 대응)
 * - 2025-10-23: 자동 실행 → 수동 클릭 (스캐너 2차 대응)
 * - 2025-10-23: 세션 동기화 문제 해결 (callback → bootstrap 리다이렉트)
 */

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

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

function CallbackPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const code = searchParams.get('code')
  const type = (searchParams.get('type') || 'signup').toLowerCase()

  // 코드가 없으면 로그인으로 리다이렉트
  if (!code) {
    router.replace('/auth/login')
    return null
  }

  // 사용자가 버튼 클릭 시 코드 교환 시작
  const handleVerifyClick = () => {
    const requestId = crypto.randomUUID()
    console.log('[auth/callback] User initiated verification:', {
      requestId,
      type,
      timestamp: new Date().toISOString(),
    })
    setStatus('loading')
    handleCallback(code, type, requestId)
  }

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

      // ✅ Step 4: 세션 교환 성공 → bootstrap 페이지로 리다이렉트
      // bootstrap 페이지에서 서버 세션이 완전히 동기화된 후 프로필 생성 및 라우팅 처리
      console.log('[auth/callback] Redirecting to bootstrap for profile creation:', { requestId, userId })
      setStatus('success')
      router.replace('/auth/bootstrap')
    } catch (error) {
      console.error('[auth/callback] Unexpected error:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
      router.replace('/auth/login')
      setStatus('error')
    }
  }

  // 상태별 UI 렌더링
  if (status === 'idle') {
    // 중간 랜딩 페이지: 사용자 클릭 대기
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">이메일 인증 확인</CardTitle>
              <CardDescription className="mt-2">
                아래 버튼을 클릭하여 이메일 인증을 완료하세요
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">보안 안내</p>
                  <p className="text-muted-foreground">
                    이메일 링크를 클릭하셨다면, 아래 버튼을 눌러 인증을 완료하세요.
                    이 과정은 자동으로 진행되지 않으며, 사용자의 확인이 필요합니다.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleVerifyClick}
            >
              <Mail className="mr-2 h-5 w-5" />
              이메일 인증 완료하기
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              로그인 페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 로딩 또는 에러 상태
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

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">로딩 중</h2>
            <p className="text-sm text-muted-foreground">
              페이지를 불러오는 중입니다.
            </p>
          </div>
        </div>
      </div>
    }>
      <CallbackPageContent />
    </Suspense>
  )
}
