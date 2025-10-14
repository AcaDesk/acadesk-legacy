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
import { authService } from "@/services/auth/auth.service"
import { oauthService } from "@/services/auth/oauthService"
import { useToast } from "@/hooks/use-toast"
import type { OAuthProvider } from "@/types/auth.types"

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const handleSocialLogin = async (provider: OAuthProvider) => {
    setIsLoading(true)
    try {
      const { error } = await oauthService.signInWithOAuth(provider)

      if (error) {
        toast({
          title: `${provider === "google" ? "구글" : "카카오"} 로그인 실패`,
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: `${provider === "google" ? "구글" : "카카오"} 로그인 중 오류가 발생했습니다.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await authService.signIn({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast({
          title: "로그인 실패",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "로그인 성공",
        description: "대시보드로 이동합니다.",
      })

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast({
        title: "오류가 발생했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-8", className)}
      onSubmit={handleSubmit(onSubmit)}
      {...props}
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold">로그인</h1>
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
          onClick={() => handleSocialLogin("google")}
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
          구글로 로그인
        </Button>

        <Button
          type="button"
          className="w-full border-0 bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] dark:bg-[#FEE500] dark:text-[#000000] dark:hover:bg-[#FDD835]"
          onClick={() => handleSocialLogin("kakao")}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.486 3 2 6.262 2 10.293c0 2.51 1.597 4.716 4.015 6.05-.175.637-.637 2.363-.731 2.727-.113.438.16.43.338.313.144-.094 2.288-1.553 3.15-2.138.712.098 1.449.149 2.228.149 5.514 0 10-3.262 10-7.293C22 6.262 17.514 3 12 3z" />
          </svg>
          카카오로 로그인
        </Button>

        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-card px-2 text-muted-foreground">
            또는 이메일로 로그인
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
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password field */}
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">비밀번호</Label>
            <Link
              href="/auth/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              비밀번호 찾기
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
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
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "로그인 중..." : "로그인"}
        </Button>
      </div>

      <div className="text-center text-sm">
        계정이 없으신가요?{" "}
        <Link href="/auth/signup" className="underline underline-offset-4">
          회원가입
        </Link>
      </div>
    </form>
  )
}
