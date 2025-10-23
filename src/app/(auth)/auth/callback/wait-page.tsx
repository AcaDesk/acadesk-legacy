/**
 * Callback Wait Page Component
 *
 * 사용자가 "이메일 인증 완료하기" 버튼을 클릭하여
 * handleAuthCallback Server Action을 호출하도록 유도
 *
 * 이렇게 하면:
 * - 메일 스캐너는 버튼을 클릭할 수 없음 (JS 실행 안 됨)
 * - 실제 사용자만 버튼 클릭으로 인증 토큰 소비
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/card'
import { handleAuthCallback } from '@/app/actions/auth'
import { useToast } from '@/hooks/use-toast'

interface CallbackWaitPageProps {
  code: string
  type: string
}

export default function CallbackWaitPage({ code, type }: CallbackWaitPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  // 사용자가 버튼 클릭 시 Server Action 호출
  const handleContinue = async () => {
    setIsProcessing(true)

    try {
      // Server Action 호출
      const result = await handleAuthCallback(code, type)

      if (!result.success) {
        console.error('[CallbackWaitPage] Auth callback failed:', result.error)
        toast({
          title: '인증 실패',
          description: result.error || '인증에 실패했습니다.',
          variant: 'destructive',
        })

        // 에러 발생 시 nextUrl로 리다이렉트
        if (result.nextUrl) {
          router.push(result.nextUrl)
        }
        return
      }

      console.log('[CallbackWaitPage] Auth callback success, redirecting to:', result.nextUrl)

      // 성공 시 nextUrl로 리다이렉트
      if (result.nextUrl) {
        router.push(result.nextUrl)
      } else {
        // nextUrl이 없으면 대시보드로
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('[CallbackWaitPage] Unexpected error:', error)
      toast({
        title: '오류 발생',
        description: '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
      router.push('/auth/login')
    } finally {
      setIsProcessing(false)
    }
  }

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
                  이메일 링크를 클릭하셨다면, 아래 버튼을 눌러 인증을 완료하세요. 이
                  과정은 자동으로 진행되지 않으며, 사용자의 확인이 필요합니다.
                </p>
              </div>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                이메일 인증 완료하기
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/auth/login')}
            disabled={isProcessing}
          >
            로그인 페이지로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
