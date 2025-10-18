"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, RefreshCw, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getAuthErrorMessage, EMAIL_RESEND_SUCCESS_MESSAGE, GENERIC_ERROR_MESSAGE, RATE_LIMIT_MESSAGES } from "@/lib/auth-messages"
import { routeAfterLogin } from "@/lib/auth/route-after-login"
import { inviteTokenStore } from "@/lib/auth/invite-token-store"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  const [isResending, setIsResending] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()

  // Rate Limiting: 60초 대기 시간 체크
  useEffect(() => {
    const checkRateLimit = () => {
      const lastResendTime = localStorage.getItem("lastEmailResendTime")
      if (lastResendTime) {
        const elapsed = Date.now() - parseInt(lastResendTime, 10)
        const waitTime = 60000 // 60초

        if (elapsed < waitTime) {
          const remaining = Math.ceil((waitTime - elapsed) / 1000)
          setRemainingSeconds(remaining)
        } else {
          setRemainingSeconds(0)
        }
      }
    }

    // 초기 체크
    checkRateLimit()

    // 1초마다 카운트다운 업데이트
    const intervalId = setInterval(() => {
      if (remainingSeconds > 0) {
        setRemainingSeconds(prev => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // 자동으로 인증 상태 확인 (3초마다)
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const checkAuthStatus = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error("Auth check error:", error)
          return
        }

        // 이메일 인증이 완료되었으면 단일 라우팅 규칙 적용
        if (user?.email_confirmed_at) {
          setIsCheckingAuth(true)
          toast({
            title: "이메일 인증 완료",
            description: "다음 단계로 이동합니다...",
          })
          // 잠시 후 리디렉트 (사용자가 메시지를 볼 수 있도록)
          setTimeout(async () => {
            const inviteToken = inviteTokenStore.get()
            await routeAfterLogin(router, inviteToken ?? undefined)
          }, 1000)
        }
      } catch (error) {
        console.error("Failed to check auth status:", error)
      }
    }

    // 초기 체크
    checkAuthStatus()

    // 3초마다 반복 체크
    intervalId = setInterval(checkAuthStatus, 3000)

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [router, supabase.auth, toast])

  const handleResendEmail = async () => {
    if (!email) return

    // Rate Limiting 체크
    if (remainingSeconds > 0) {
      toast({
        title: RATE_LIMIT_MESSAGES.emailResendWait.title,
        description: RATE_LIMIT_MESSAGES.emailResendWait.description(remainingSeconds),
        variant: "destructive",
      })
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      })

      if (error) {
        // Rate limit 에러 특별 처리
        if (error.message?.toLowerCase().includes("rate limit") ||
            error.message?.toLowerCase().includes("too many")) {
          toast({
            title: RATE_LIMIT_MESSAGES.emailTooMany.title,
            description: RATE_LIMIT_MESSAGES.emailTooMany.description,
            variant: "destructive",
          })
        } else {
          toast({
            title: "이메일 재전송 실패",
            description: getAuthErrorMessage(error),
            variant: "destructive",
          })
        }
        return
      }

      // 성공 시 마지막 재전송 시간 기록
      localStorage.setItem("lastEmailResendTime", Date.now().toString())
      setRemainingSeconds(60)

      toast({
        title: EMAIL_RESEND_SUCCESS_MESSAGE.title,
        description: EMAIL_RESEND_SUCCESS_MESSAGE.description,
      })
    } catch (error) {
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-4 pb-4 pt-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            >
              <Mail className="h-10 w-10 text-primary" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">
                이메일을 확인해주세요
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                회원가입이 거의 완료되었습니다!
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  {isCheckingAuth ? (
                    <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-primary" />
                  ) : (
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  )}
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">
                      {isCheckingAuth ? "인증 확인 중..." : "인증 이메일을 보냈습니다"}
                    </p>
                    {email && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {email}
                        </span>
                        로 인증 링크를 보냈습니다.
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {isCheckingAuth
                        ? "인증이 완료되었습니다. 잠시만 기다려주세요..."
                        : "이메일의 인증 링크를 클릭하면 자동으로 다음 단계로 이동합니다."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
                <p className="font-medium text-foreground">다음 단계:</p>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>이메일 수신함을 확인하세요</li>
                  <li>스팸 폴더도 확인해주세요</li>
                  <li>이메일의 인증 링크를 클릭하세요</li>
                  <li>원장님의 경우 승인 대기 후 학원 설정을 진행합니다</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isResending || !email || remainingSeconds > 0}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                {isResending
                  ? "재전송 중..."
                  : remainingSeconds > 0
                    ? `${remainingSeconds}초 후 재전송 가능`
                    : "인증 이메일 다시 받기"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                이메일이 오지 않으셨나요? 스팸 폴더를 확인하거나
                <br />
                위 버튼을 눌러 다시 받아보세요.
              </p>
            </div>
          </CardContent>
        </Card>
    </motion.div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">로딩 중...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
