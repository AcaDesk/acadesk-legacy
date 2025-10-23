/**
 * Bootstrap Page - NO_PROFILE 상태 처리
 *
 * auth.users는 있지만 public.users 레코드가 없을 때 자동 생성
 * create_user_profile() RPC 호출 → 성공 시 자동 라우팅
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { useAuthStage } from '@/hooks/use-auth-stage'
import { getAuthStageErrorMessage } from '@/lib/auth/auth-errors'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BootstrapPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [hasAttempted, setHasAttempted] = useState(false)
  const { isLoading, error, createProfile } = useAuthStage({
    autoRoute: true,
    successMessage: {
      title: '프로필 생성 완료',
      description: '다음 단계로 이동합니다.',
    },
  })

  // 마운트 시 한 번만 createProfile 호출
  useEffect(() => {
    if (!hasAttempted) {
      setHasAttempted(true)
      createProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 프로그레스 시뮬레이션 (실제로는 RPC 단계별 업데이트 가능)
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

  // 재시도 핸들러
  const handleRetry = () => {
    createProfile()
  }

  // 에러 정보 가져오기
  const errorInfo = error ? getAuthStageErrorMessage(error) : null

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
            {errorInfo.canRetry && (
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
