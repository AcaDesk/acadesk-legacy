"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleSelector } from "@/components/auth/RoleSelector"
import { TermsCheckbox } from "@/components/auth/TermsCheckbox"
import { onboardingService } from "@/services/auth/onboardingService"
import type { OnboardingFormData } from "@/types/auth.types"
import { createClient } from "@/lib/supabase/client"
import { ONBOARDING_MESSAGES, LOGOUT_SUCCESS_MESSAGE, GENERIC_ERROR_MESSAGE, EMAIL_VERIFICATION_SUCCESS_MESSAGE } from "@/lib/auth-messages"

const onboardingSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  role: z.enum(["owner", "staff"]),
  academyName: z.string().optional(), // Owner role일 때 필수
  invitationCode: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, {
    message: "이용약관에 동의해주세요.",
  }),
  privacy: z.boolean().refine((val) => val === true, {
    message: "개인정보처리방침에 동의해주세요.",
  }),
  marketing: z.boolean(), // 선택 사항
}).superRefine((data, ctx) => {
  // Owner role일 때 academyName 필수 검증
  if (data.role === "owner" && !data.academyName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "학원명은 필수입니다.",
      path: ["academyName"],
    })
  }
  // Staff role일 때 invitationCode 필수 검증
  if (data.role === "staff" && !data.invitationCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "초대 코드는 필수입니다.",
      path: ["invitationCode"],
    })
  }
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

/**
 * 이메일 인증 성공 메시지를 표시하는 컴포넌트
 * useSearchParams()를 사용하므로 Suspense로 감싸야 함
 */
function EmailVerificationToast() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const verified = searchParams.get("verified")
    if (verified === "true") {
      toast({
        title: EMAIL_VERIFICATION_SUCCESS_MESSAGE.title,
        description: EMAIL_VERIFICATION_SUCCESS_MESSAGE.description,
      })
      // URL 파라미터 제거
      const url = new URL(window.location.href)
      url.searchParams.delete("verified")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, toast])

  return null
}

/**
 * 온보딩 폼 컴포넌트
 */
function OnboardingForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: "owner",
      terms: false,
      privacy: false,
      marketing: false,
    },
  })

  const selectedRole = watch("role")

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      toast({
        title: LOGOUT_SUCCESS_MESSAGE.title,
        description: LOGOUT_SUCCESS_MESSAGE.description,
      })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user, error: userError } = await onboardingService.getCurrentUser()

        if (userError || !user) {
          toast({
            title: ONBOARDING_MESSAGES.authRequired.title,
            description: ONBOARDING_MESSAGES.authRequired.description,
            variant: "destructive",
          })
          router.push("/auth/login")
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || null)

        const name = user.user_metadata?.full_name || user.user_metadata?.name || ""
        setUserName(name)
        if (name) {
          setValue("name", name)
        }

        // 사용자 정보 직접 조회 (RLS: users_self_select 정책)
        const { data: profile } = await supabase
          .from("users")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.onboarding_completed) {
          router.push("/dashboard")
          return
        }
      } catch (error) {
        console.error("Error checking user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router, setValue, toast])

  const onSubmit = async (data: OnboardingFormData) => {
    if (!userId) {
      toast({
        title: ONBOARDING_MESSAGES.authRequired.title,
        description: ONBOARDING_MESSAGES.authRequired.description,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // MVP: staff 역할은 현재 미지원 (invitation 테이블/RPC 없음)
      if (data.role === "staff") {
        toast({
          title: "준비 중인 기능",
          description: "강사/직원 초대 기능은 현재 준비 중입니다. owner 역할을 선택해주세요.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Owner 온보딩
      if (data.role === "owner") {
        const { error } = await onboardingService.completeOwnerOnboarding(userId, data)

        if (error) {
          toast({
            title: GENERIC_ERROR_MESSAGE.title,
            description: GENERIC_ERROR_MESSAGE.description,
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        toast({
          title: ONBOARDING_MESSAGES.ownerSuccess.title,
          description: ONBOARDING_MESSAGES.ownerSuccess.description,
        })

        router.push("/auth/pending-approval")
      }
    } catch (error) {
      console.error("Onboarding error:", error)
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">사용자 정보 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card>
        <CardHeader className="space-y-2 text-center relative">
          {/* 로그아웃 버튼 - 우측 상단 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="absolute right-4 top-4"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </>
            )}
          </Button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-2xl">
            {userName ? `${userName}님, 환영합니다!` : "마지막 단계입니다!"}
          </CardTitle>
          <CardDescription>
            {userEmail && !userName && `${userEmail}님, `}
            서비스 이용을 위해 추가 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <RoleSelector
              value={selectedRole}
              onChange={(value) => setValue("role", value)}
              error={errors.role?.message}
              disabled={isSubmitting}
            />

            {selectedRole === "owner" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="academyName">학원명</Label>
                <Input
                  id="academyName"
                  placeholder="예) 서울학원"
                  {...register("academyName")}
                  disabled={isSubmitting}
                />
                {errors.academyName && (
                  <p className="text-sm text-destructive">
                    {errors.academyName.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  학원 이름을 입력해주세요
                </p>
              </motion.div>
            )}

            {/* MVP: staff 역할은 현재 미지원 */}
            {selectedRole === "staff" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4"
              >
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  💡 준비 중인 기능
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  강사/직원 초대 기능은 현재 준비 중입니다.
                  원장 역할을 선택하여 학원을 먼저 생성해주세요.
                </p>
              </motion.div>
            )}

            {/* 약관 동의 */}
            <TermsCheckbox
              value={{
                terms: watch("terms"),
                privacy: watch("privacy"),
                marketing: watch("marketing"),
              }}
              onChange={(values) => {
                setValue("terms", values.terms)
                setValue("privacy", values.privacy)
                setValue("marketing", values.marketing)
              }}
              error={errors.terms?.message || errors.privacy?.message}
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "시작하기"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  )
}

/**
 * 메인 온보딩 페이지
 * EmailVerificationToast를 Suspense로 감싸서 useSearchParams() 에러 방지
 */
export default function OnboardingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <EmailVerificationToast />
      </Suspense>
      <OnboardingForm />
    </>
  )
}
