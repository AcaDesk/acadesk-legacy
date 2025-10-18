"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createUpdatePasswordUseCase } from "@/application/factories/authUseCaseFactory.client"

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .regex(/[a-zA-Z]/, "영문자를 포함해야 합니다.")
      .regex(/[0-9]/, "숫자를 포함해야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

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

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch("password")

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPasswordStrength(calculatePasswordStrength(value))
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true)
    try {
      const updatePasswordUseCase = createUpdatePasswordUseCase()
      const { error } = await updatePasswordUseCase.execute(data.password)

      if (error) {
        toast({
          title: "비밀번호 변경 실패",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "비밀번호 변경 완료",
        description: "새로운 비밀번호로 로그인해주세요.",
      })

      router.push("/auth/login")
    } catch {
      toast({
        title: "오류가 발생했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const strengthInfo = getPasswordStrengthLabel(passwordStrength)

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
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <KeyRound className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-2xl">새 비밀번호 설정</CardTitle>
          <CardDescription className="mt-2">
            새로운 비밀번호를 입력해주세요.
            <br />
            영문, 숫자를 포함하여 8자 이상이어야 합니다.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  placeholder="8자 이상, 영문+숫자 포함"
                  autoComplete="new-password"
                  {...register("password")}
                  onChange={(e) => {
                    register("password").onChange(e)
                    handlePasswordChange(e)
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
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
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="pr-10"
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "비밀번호 변경"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  )
}
