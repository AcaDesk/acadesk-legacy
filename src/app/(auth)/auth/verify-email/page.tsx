"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [isResending, setIsResending] = useState(false)
  const { toast } = useToast()

  const handleResendEmail = async () => {
    if (!email) return

    setIsResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      })

      if (error) {
        toast({
          title: "재전송 실패",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "이메일 재전송 완료",
        description: "인증 이메일을 다시 보냈습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "이메일 재전송 중 오류가 발생했습니다.",
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
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">
                      인증 이메일을 보냈습니다
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
                      이메일의 인증 링크를 클릭하여 계정을 활성화해주세요.
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
                disabled={isResending || !email}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                {isResending ? "재전송 중..." : "인증 이메일 다시 받기"}
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
