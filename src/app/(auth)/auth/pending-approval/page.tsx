"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Mail, RefreshCw } from "lucide-react"
import { authService } from "@/services/auth/auth.service"
import { createClient } from "@/lib/supabase/client"

export default function PendingApprovalPage() {
  const [userEmail, setUserEmail] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUserEmail = async () => {
      const user = await authService.getCurrentUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUserEmail()
  }, [])

  const handleCheckStatus = async () => {
    setIsChecking(true)
    try {
      const supabase = createClient()
      const user = await authService.getCurrentUser()

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("approval_status")
          .eq("id", user.id)
          .single()

        if (data?.approval_status === "approved") {
          router.push("/dashboard")
        } else if (data?.approval_status === "rejected") {
          alert("죄송합니다. 회원가입이 거부되었습니다. 관리자에게 문의해주세요.")
        }
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleLogout = async () => {
    await authService.signOut()
    router.push("/auth/login")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none shadow-lg">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10"
            >
              <Clock className="h-8 w-8 text-amber-500" />
            </motion.div>
            <CardTitle className="text-2xl">승인 대기 중</CardTitle>
            <CardDescription className="mt-2">
              회원가입 신청이 완료되었습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                관리자 승인 후 모든 기능을 사용하실 수 있습니다.
                <br />
                승인은 1-2 영업일 내에 완료됩니다.
              </p>
              {userEmail && (
                <p className="mt-3 text-sm font-medium text-foreground">
                  <Mail className="mr-2 inline h-4 w-4" />
                  {userEmail}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full"
                variant="outline"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    승인 상태 확인
                  </>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full"
              >
                로그아웃
              </Button>
            </div>

            <div className="mt-6 rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">안내:</strong>
                <br />• 승인이 완료되면 등록하신 이메일로 알림이 발송됩니다.
                <br />• 승인 후 학원 설정을 완료해주세요.
                <br />• 문의사항은 support@acadesk.com으로 연락주세요.
              </p>
            </div>
          </CardContent>
        </Card>
    </motion.div>
  )
}
