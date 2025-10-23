/**
 * Bootstrap Page - NO_PROFILE 상태 처리
 *
 * auth.users는 있지만 public.users 레코드가 없을 때 자동 생성
 * createUserProfileServer() Server Action 호출 → 성공 시 자동 라우팅
 *
 * ✅ 완전히 server-side + service_role 기반으로 동작
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { createUserProfileServer, checkOnboardingStage } from '@/app/actions/onboarding'
import { createClient } from '@/lib/supabase/client'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'

export default function BootstrapPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAttempted, setHasAttempted] = useState(false)

  // 프로그레스 시뮬레이션
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 10
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isLoading])

  // 마운트 시 한 번만 프로필 생성 시도
  useEffect(() => {
    if (hasAttempted) return
    setHasAttempted(true)

    async function bootstrap() {
      try {
        // 1. 현재 사용자 ID 가져오기
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error('[BootstrapPage] No user found')
          router.push('/auth/login')
          return
        }

        const userId = user.id
        console.log('[BootstrapPage] Creating profile for user:', userId)

        // 2. Server Action으로 프로필 생성 (service_role 사용)
        const requestId = crypto.randomUUID()
        const result = await createUserProfileServer(userId /*, requestId? */)
        if (!result.success) {
          console.error('[BootstrapPage] Profile creation failed:', { requestId, error: result.error })
          setError(result.error || '프로필 생성에 실패했습니다.')
          setIsLoading(false)
          return
        }

        console.log('[BootstrapPage] Profile created successfully')

        // 3. 온보딩 상태 확인 후 라우팅
        const inviteToken = inviteTokenStore.get()
        const stageResult = await checkOnboardingStage(inviteToken || undefined)

        if (!stageResult.success || !stageResult.data) {
          console.error('[BootstrapPage] Stage check failed:', stageResult.error)
          router.push('/auth/login?verified=true')
          return
        }

        const stage = stageResult.data as any
        const nextUrl = stage.stage?.next_url
        const stageCode = stage.stage?.code

        console.log('[BootstrapPage] Routing to:', nextUrl || '/dashboard', 'Stage:', stageCode)

        if (nextUrl) {
          router.push(nextUrl)
        } else if (stageCode === 'READY') {
          router.push('/dashboard')
        } else {
          router.push('/auth/login?verified=true')
        }
      } catch (err) {
        console.error('[BootstrapPage] Bootstrap error:', err)
        setError('알 수 없는 오류가 발생했습니다.')
        setIsLoading(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 재시도 핸들러
  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    setProgress(0)
    setHasAttempted(false)
  }

  // 로딩 상태
  if (isLoading && !error) {
    return (
      <AuthLoadingState
        stage="프로필 초기화"
        message="계정 정보를 설정하고 있습니다"
        progress={progress}
        icon={<UserPlus className="h-8 w-8 text-primary" />}
        completedSteps={progress >= 30 ? ['계정 확인'] : []}
        totalSteps={2}
      />
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>프로필 생성 실패</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRetry} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '다시 시도'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              로그인으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
