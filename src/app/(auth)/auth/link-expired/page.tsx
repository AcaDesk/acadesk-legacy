"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Mail, RefreshCw, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { LINK_EXPIRED_MESSAGES, EMAIL_RESEND_SUCCESS_MESSAGE, GENERIC_ERROR_MESSAGE, RATE_LIMIT_MESSAGES, getAuthErrorMessage } from "@/lib/auth-messages"

function LinkExpiredContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get("type") || "signup" // signup, recovery, invitation
  const errorType = searchParams.get("error") || "expired" // expired, used, invalid, unknown
  const { toast } = useToast()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

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

  // 에러 타입에 따른 메시지 선택
  const getErrorMessage = () => {
    if (errorType === "used") {
      return LINK_EXPIRED_MESSAGES.alreadyUsed
    }
    if (errorType === "invalid") {
      return LINK_EXPIRED_MESSAGES.invalid
    }

    // expired 또는 unknown인 경우, type에 따라 메시지 선택
    if (type === "recovery") {
      return LINK_EXPIRED_MESSAGES.recovery
    }
    if (type === "invitation") {
      return LINK_EXPIRED_MESSAGES.invitation
    }
    return LINK_EXPIRED_MESSAGES.signup
  }

  const message = getErrorMessage()

  // 인증 이메일 재전송
  const handleResendSignupEmail = async () => {
    if (!email) {
      toast({
        title: "이메일 주소 필요",
        description: "이메일 주소를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    // Rate Limiting 체크
    if (remainingSeconds > 0) {
      toast({
        title: RATE_LIMIT_MESSAGES.emailResendWait.title,
        description: RATE_LIMIT_MESSAGES.emailResendWait.description(remainingSeconds),
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
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

      // 이메일 인증 페이지로 리디렉트
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } catch (error) {
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 비밀번호 재설정 재요청
  const handleResendRecoveryEmail = async () => {
    if (!email) {
      toast({
        title: "이메일 주소 필요",
        description: "이메일 주소를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    // Rate Limiting 체크
    if (remainingSeconds > 0) {
      toast({
        title: RATE_LIMIT_MESSAGES.emailResendWait.title,
        description: RATE_LIMIT_MESSAGES.emailResendWait.description(remainingSeconds),
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
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
            title: "비밀번호 재설정 요청 실패",
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
        title: "비밀번호 재설정 이메일 전송 완료",
        description: "이메일함을 확인해주세요.",
      })

      // 비밀번호 찾기 페이지로 리디렉트
      router.push("/auth/forgot-password")
    } catch (error) {
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 액션 핸들러
  const handleAction = () => {
    if (type === "recovery") {
      if (email) {
        handleResendRecoveryEmail()
      } else {
        router.push("/auth/forgot-password")
      }
    } else if (type === "invitation") {
      router.push("/auth/login")
    } else if (errorType === "used") {
      router.push("/auth/login")
    } else {
      // signup
      handleResendSignupEmail()
    }
  }

  // 이메일 입력이 필요한 경우
  const needsEmailInput = (type === "signup" || type === "recovery") && errorType !== "used"

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
            className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
          >
            <AlertCircle className="h-10 w-10 text-destructive" />
          </motion.div>
          <div className="text-center">
            <CardTitle className="text-2xl">{message.title}</CardTitle>
            <CardDescription className="mt-2">
              {message.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8">
          {/* 이메일 입력 필드 (필요한 경우만) */}
          {needsEmailInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="email">이메일 주소</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground">
                {type === "recovery"
                  ? "비밀번호를 재설정할 이메일 주소를 입력해주세요."
                  : "가입하신 이메일 주소를 입력해주세요."}
              </p>
            </motion.div>
          )}

          {/* 안내 메시지 */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">알고 계셨나요?</p>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                  <li>인증 링크는 1시간 동안만 유효합니다</li>
                  <li>한 번 사용된 링크는 재사용할 수 없습니다</li>
                  <li>새로운 링크를 받으면 이전 링크는 자동으로 무효화됩니다</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAction}
              disabled={isProcessing || (needsEmailInput && !email) || (needsEmailInput && remainingSeconds > 0)}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : remainingSeconds > 0 && needsEmailInput ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {`${remainingSeconds}초 후 재전송 가능`}
                </>
              ) : (
                <>
                  {errorType === "used" || type === "invitation" ? (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {message.action}
                </>
              )}
            </Button>

            {/* 로그인 페이지로 돌아가기 */}
            {errorType !== "used" && type !== "invitation" && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/auth/login")}
              >
                로그인 페이지로 돌아가기
              </Button>
            )}
          </div>

          {/* 도움말 */}
          <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">문제가 계속되나요?</strong>
            <br />
            team@acadesk.site로 문의해주세요. 빠르게 도와드리겠습니다.
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function LinkExpiredPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">로딩 중...</div>}>
      <LinkExpiredContent />
    </Suspense>
  )
}
