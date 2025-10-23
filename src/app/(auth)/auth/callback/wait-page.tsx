/**
 * Callback Wait Page Component
 *
 * 사용자가 "이메일 인증 완료하기" 버튼을 클릭하여 PKCE flow를 완료하도록 유도
 *
 * PKCE Flow (클라이언트 기반):
 * 1. 클라이언트에서 code 교환 (code_verifier 접근 가능)
 * 2. 세션이 생성되면 서버 액션으로 프로필 생성/온보딩 체크
 *
 * 이렇게 하면:
 * - 메일 스캐너는 버튼을 클릭할 수 없음 (JS 실행 안 됨)
 * - 실제 사용자만 버튼 클릭으로 인증 토큰 소비
 * - PKCE code_verifier가 브라우저에 있어서 교환 성공
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
import { createClient } from '@/lib/supabase/client'
import { postAuthSetup } from '@/app/actions/auth'
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
      // handleAuthCallback은 이제 redirect()를 직접 호출하므로
      // 성공 시 이 함수는 리턴되지 않고 redirect가 발생합니다
      await handleAuthCallback(code, type)

      // 이 코드는 redirect가 실패했을 때만 실행됩니다 (드문 경우)
      console.warn('[CallbackWaitPage] handleAuthCallback returned without redirect')
      router.push('/dashboard')
    } catch (error) {
      // redirect()는 NEXT_REDIRECT 에러를 throw하므로 이것은 정상 동작입니다
      // 다른 에러만 처리합니다
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = String((error as { digest: unknown }).digest)
        if (digest.startsWith('NEXT_REDIRECT')) {
          // redirect 에러는 재throw하여 Next.js가 처리하도록 함
          throw error
        }
      }

      // 그 외 실제 에러 처리
      console.error('[CallbackWaitPage] Unexpected error:', error)
      toast({
        title: '인증 오류',
        description: '인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
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
