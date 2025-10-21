/**
 * Invite Accept Page - MEMBER_INVITED 상태 처리
 *
 * 직원 초대 수락 페이지
 * - URL 쿼리에서 token 추출 → localStorage 저장
 * - accept_staff_invite() RPC 호출
 * - 성공 시 /dashboard로 이동
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, UserCheck } from 'lucide-react'
import { useAuthStage } from '@/hooks/use-auth-stage'
import { getAuthStageErrorMessage } from '@/lib/auth/auth-errors'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function InviteAcceptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const { isLoading, error, acceptInvite } = useAuthStage({
    autoRoute: true,
    successMessage: {
      title: '초대 수락 완료',
      description: '학원 멤버로 등록되었습니다. 대시보드로 이동합니다.',
    },
  })

  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // 1. 쿼리에서 토큰 추출 → localStorage 저장
    const urlToken = searchParams.get('token')
    const savedToken = inviteTokenStore.get()

    const finalToken = urlToken || savedToken

    if (!finalToken) {
      // 토큰이 없으면 로그인으로 이동
      router.push('/auth/login')
      return
    }

    // localStorage에 저장 (창 닫기 방지)
    if (urlToken) {
      inviteTokenStore.save(urlToken)
    }

    setToken(finalToken)
  }, [searchParams, router])

  useEffect(() => {
    if (!token) return

    // 2. 초대 수락
    acceptInvite(token)
  }, [token, acceptInvite])

  // 프로그레스 시뮬레이션
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 12
      })
    }, 350)

    return () => clearInterval(interval)
  }, [isLoading])

  // 재시도 핸들러
  const handleRetry = () => {
    if (!token) return
    acceptInvite(token)
  }

  // 에러 정보 가져오기
  const errorInfo = error ? getAuthStageErrorMessage(error) : null

  // 로딩 상태
  if (isLoading && !error) {
    return (
      <AuthLoadingState
        stage="초대 수락 중"
        message="학원 멤버로 등록하고 있습니다"
        progress={progress}
        icon={<UserCheck className="h-8 w-8 text-primary" />}
        completedSteps={
          progress >= 60
            ? ['초대 확인', '권한 설정']
            : progress >= 30
            ? ['초대 확인']
            : []
        }
        totalSteps={3}
      />
    )
  }

  // 에러 상태
  if (error && errorInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>{errorInfo.title}</CardTitle>
            </div>
            <CardDescription>{errorInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {token && errorInfo.canRetry && (
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
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              로그인으로 돌아가기
            </Button>
            {!errorInfo.canRetry && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  초대가 만료되었거나 이미 사용되었을 수 있습니다.
                  <br />
                  학원 관리자에게 새로운 초대를 요청하세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  )
}
