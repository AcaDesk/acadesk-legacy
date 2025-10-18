"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { TermsCheckbox, type TermsCheckboxValues } from "@/components/auth/TermsCheckbox"
import type { OAuthProvider } from "@/types/auth.types"
import { getAuthErrorMessage, SIGNUP_SUCCESS_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/lib/auth-messages"
import { createSignUpUseCase, createSignInWithOAuthUseCase } from "@/application/factories/authUseCaseFactory.client"

// 비밀번호 강도 계산
const calculatePasswordStrength = (password: string): number => {
  let strength = 0
  if (password.length >= 8) strength += 25
  if (password.length >= 12) strength += 25
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
  if (/[0-9]/.test(password)) strength += 15
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10
  return Math.min(strength, 100)
}

const getPasswordStrengthLabel = (
  strength: number
): { label: string; color: string } => {
  if (strength < 40) return { label: "약함", color: "bg-red-500" }
  if (strength < 70) return { label: "보통", color: "bg-yellow-500" }
  return { label: "강함", color: "bg-green-500" }
}

const signupSchema = z
  .object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .regex(/[a-zA-Z]/, "영문자를 포함해야 합니다.")
      .regex(/[0-9]/, "숫자를 포함해야 합니다."),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "이용약관에 동의해주세요.",
    }),
    privacy: z.boolean().refine((val) => val === true, {
      message: "개인정보처리방침에 동의해주세요.",
    }),
    marketing: z.boolean(), // 선택 사항
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      terms: false,
      privacy: false,
      marketing: false,
    },
    mode: "onBlur",
  })

  const password = watch("password")

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPasswordStrength(calculatePasswordStrength(value))
  }

  const handleSocialSignup = async (provider: OAuthProvider) => {
    setIsLoading(true)
    try {
      const signInWithOAuthUseCase = createSignInWithOAuthUseCase()
      const { error } = await signInWithOAuthUseCase.execute(provider)

      if (error) {
        toast({
          title: `${provider === "google" ? "구글" : "카카오"} 로그인 실패`,
          description: getAuthErrorMessage(error),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: `${provider === "google" ? "구글" : "카카오"} 로그인 오류`,
        description: getAuthErrorMessage(error as { message?: string }),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    try {
      const signUpUseCase = createSignUpUseCase()
      const { error } = await signUpUseCase.execute({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast({
          title: "회원가입 실패",
          description: getAuthErrorMessage(error),
          variant: "destructive",
        })
        return
      }

      toast({
        title: "회원가입 완료",
        description: "이메일로 전송된 링크를 클릭하여 이메일을 인증해주세요.",
      })

      router.push("/auth/verify-email?email=" + encodeURIComponent(data.email))
    } catch (error) {
      toast({
        title: GENERIC_ERROR_MESSAGE.title,
        description: GENERIC_ERROR_MESSAGE.description,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const strengthInfo = getPasswordStrengthLabel(passwordStrength)

  return (
    <form
      className={cn("flex flex-col gap-8", className)}
      onSubmit={handleSubmit(onSubmit)}
      {...props}
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold">계정 만들기</h1>
        <p className="text-balance text-muted-foreground">
          간편하게 소셜 로그인으로 시작하세요
        </p>
      </div>

      <div className="grid gap-6">
        {/* Social Login Buttons */}
        <Button
          type="button"
          variant="outline"
          className="w-full bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          onClick={() => handleSocialSignup("google")}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          구글로 가입
        </Button>

        <Button
          type="button"
          className="w-full border-0 bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] dark:bg-[#FEE500] dark:text-[#000000] dark:hover:bg-[#FDD835]"
          onClick={() => handleSocialSignup("kakao")}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.486 3 2 6.262 2 10.293c0 2.51 1.597 4.716 4.015 6.05-.175.637-.637 2.363-.731 2.727-.113.438.16.43.338.313.144-.094 2.288-1.553 3.15-2.138.712.098 1.449.149 2.228.149 5.514 0 10-3.262 10-7.293C22 6.262 17.514 3 12 3z" />
          </svg>
          카카오로 가입
        </Button>

        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-card px-2 text-muted-foreground">
            또는 이메일로 가입
          </span>
        </div>

        {/* Email field */}
        <div className="grid gap-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            disabled={isLoading}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              연락 및 계정 확인용으로 사용됩니다
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="grid gap-2">
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="8자 이상, 영문+숫자 포함"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password")}
              onChange={(e) => {
                register("password").onChange(e)
                handlePasswordChange(e)
              }}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {password && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">비밀번호 강도</span>
                <span
                  className={`font-medium ${
                    passwordStrength < 40
                      ? "text-red-600"
                      : passwordStrength < 70
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {strengthInfo.label}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${strengthInfo.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              최소 8자 이상이어야 합니다
            </p>
          )}
        </div>

        {/* Confirm Password field */}
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirmPassword")}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              비밀번호를 다시 입력해주세요
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
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
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "계정 생성 중..." : "계정 만들기"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="underline underline-offset-4">
            로그인
          </Link>
        </div>
      </div>
    </form>
  )
}
