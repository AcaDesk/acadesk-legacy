/**
 * Pending Page - PENDING_OWNER_REVIEW 상태 처리
 *
 * 원장 승인 대기 중인 사용자를 위한 페이지
 * - 승인 대기 안내
 * - 새로고침 버튼 (상태 재확인)
 * - 로그아웃 옵션
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Clock, LogOut, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { routeAfterLogin } from '@/lib/auth/route-after-login'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { inviteTokenStore } from '@/lib/auth/invite-token-store'

export default function PendingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // 상태 재확인
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)

      // get_auth_stage 재호출하여 상태 확인
      const inviteToken = inviteTokenStore.get()
      await routeAfterLogin(router, inviteToken ?? undefined)
    } catch (err) {
      console.error('[Pending] Refresh error:', err)
      toast({
        title: '상태 확인 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // 로그아웃
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)

      await supabase.auth.signOut()

      toast({
        title: '로그아웃 완료',
        description: '안전하게 로그아웃되었습니다.',
      })

      router.push('/auth/login')
    } catch (err) {
      console.error('[Pending] Logout error:', err)
      toast({
        title: '로그아웃 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/20">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-2xl">승인 대기 중</CardTitle>
          <CardDescription className="text-base">
            관리자 승인 후 이용하실 수 있습니다.
            <br />
            승인되면 다음 로그인 시 자동으로 이동합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button
            onClick={handleRefresh}
            variant="default"
            className="w-full"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                확인 중...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                상태 새로고침
              </>
            )}
          </Button>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그아웃 중...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              승인이 지연되는 경우{' '}
              <a
                href="mailto:support@acadesk.com"
                className="text-primary hover:underline"
              >
                고객센터
              </a>
              로 문의해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
