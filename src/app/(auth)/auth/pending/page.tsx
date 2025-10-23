/**
 * Pending Page - PENDING_OWNER_REVIEW 상태 처리
 *
 * 원장 승인 대기 중인 사용자를 위한 페이지
 * - 승인 대기 안내
 * - 자동 상태 확인 (폴링)
 * - 수동 새로고침 버튼
 * - 로그아웃 옵션
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Clock, LogOut, RefreshCw, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { routeAfterLogin } from '@/lib/auth/route-after-login'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLogout } from '@/hooks/use-logout'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'

const AUTO_REFRESH_INTERVAL = 10000 // 10초마다 자동 확인

export default function PendingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())
  const [hasShownErrorToast, setHasShownErrorToast] = useState(false)

  // URL 파라미터에서 에러 메시지 읽고 토스트 표시
  useEffect(() => {
    if (hasShownErrorToast) return

    const error = searchParams.get('error')
    const message = searchParams.get('message')
    const code = searchParams.get('code')

    if (error || message) {
      const errorTitles: Record<string, string> = {
        'profile_query_failed': '프로필 조회 실패',
        'onboarding_check_failed': '온보딩 상태 확인 실패',
        'profile_creation_failed': '프로필 생성 실패',
      }

      toast({
        title: errorTitles[error || ''] || '오류가 발생했습니다',
        description: message ? decodeURIComponent(message) : `데이터베이스 오류가 발생했습니다.${code ? ` (코드: ${code})` : ''}`,
        variant: 'destructive',
      })

      setHasShownErrorToast(true)
    }
  }, [searchParams, toast, hasShownErrorToast])

  // 로그아웃 훅 사용
  const { logout, isLoading: isLoggingOut } = useLogout({
    onSuccess: () => {
      toast({
        title: '로그아웃 완료',
        description: '안전하게 로그아웃되었습니다.',
      })
    },
    onError: (error) => {
      toast({
        title: '로그아웃 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    },
  })

  // 상태 재확인 (Server Action 사용)
  const handleRefresh = async (silent = false) => {
    try {
      setIsRefreshing(true)

      // checkOnboardingStage Server Action 호출하여 상태 확인
      const inviteToken = inviteTokenStore.get()
      await routeAfterLogin(router, inviteToken ?? undefined)

      setLastChecked(new Date())
    } catch (err) {
      console.error('[Pending] Refresh error:', err)
      if (!silent) {
        toast({
          title: '상태 확인 실패',
          description: '잠시 후 다시 시도해주세요.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // 자동 상태 확인
  useEffect(() => {
    // 주기적 폴링
    const interval = setInterval(() => {
      handleRefresh(true) // silent mode
    }, AUTO_REFRESH_INTERVAL)

    // 탭 활성화/포커스 시 재조회 (승인은 보통 외부에서 일어남)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing) {
        handleRefresh(true)
      }
    }

    // 윈도우 포커스 시에도 재조회
    const handleFocus = () => {
      if (!isRefreshing) {
        handleRefresh(true)
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isRefreshing])


  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 shadow-sm">
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">승인 대기 중</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                관리자 승인 후 이용하실 수 있습니다.
                <br />
                승인되면 자동으로 대시보드로 이동합니다.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 자동 확인 상태 */}
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>자동으로 승인 상태를 확인하고 있습니다</span>
            </div>

            {/* 액션 버튼들 */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => handleRefresh(false)}
                variant="default"
                size="lg"
                className="w-full"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    지금 확인하기
                  </>
                )}
              </Button>

              <Button
                onClick={logout}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    로그아웃 중...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    로그아웃
                  </>
                )}
              </Button>
            </div>

            {/* 도움말 섹션 */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    승인은 얼마나 걸리나요?
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    일반적으로 영업일 기준 1-2일 내에 승인이 완료됩니다.
                    승인이 완료되면 등록하신 이메일로 알림을 보내드립니다.
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                승인이 지연되거나 문의사항이 있으신 경우{' '}
                <a
                  href="mailto:support@acadesk.com"
                  className="text-primary hover:underline font-medium"
                >
                  support@acadesk.com
                </a>
                으로 연락주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 마지막 확인 시간 */}
        <p className="text-center text-xs text-muted-foreground">
          마지막 확인: {lastChecked.toLocaleTimeString('ko-KR')}
        </p>
      </div>
    </div>
  )
}
