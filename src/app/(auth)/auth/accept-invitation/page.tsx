"use client"

import { Suspense, useEffect, useState } from "react"
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
import { Users, Eye, EyeOff, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { authService } from "@/services/auth/auth.service"
import { useToast } from "@/hooks/use-toast"

interface Invitation {
  id: string
  tenantId: string
  invitedBy: string
  email: string
  roleCode: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
}

const acceptInvitationSchema = z
  .object({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>

function AcceptInvitationContent() {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
  })

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("초대 링크가 유효하지 않습니다.")
      setIsLoading(false)
      return
    }

    const fetchInvitation = async () => {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("staff_invitations")
          .select("*")
          .eq("token", token)
          .single()

        if (error || !data) {
          setError("유효하지 않은 초대입니다.")
          setIsLoading(false)
          return
        }

        // 만료 확인
        if (new Date(data.expires_at) < new Date()) {
          setError("초대가 만료되었습니다.")
          setIsLoading(false)
          return
        }

        // 상태 확인
        if (data.status !== "pending") {
          setError("이미 사용된 초대입니다.")
          setIsLoading(false)
          return
        }

        setInvitation({
          id: data.id,
          tenantId: data.tenant_id,
          invitedBy: data.invited_by,
          email: data.email,
          roleCode: data.role_code,
          token: data.token,
          status: data.status,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
        })
      } catch {
        setError("초대 정보를 가져올 수 없습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [searchParams])

  const onSubmit = async (data: AcceptInvitationFormValues) => {
    if (!invitation) return

    setIsSubmitting(true)
    try {
      // 회원가입
      const { error: signUpError } = await authService.signUp({
        email: invitation.email,
        password: data.password,
        name: data.name,
        phone: "",
        academyName: "",
        role: invitation.roleCode as "admin" | "teacher" | "staff",
      })

      if (signUpError) {
        toast({
          title: "회원가입 실패",
          description: signUpError.message,
          variant: "destructive",
        })
        return
      }

      // 로그인
      const { user, error: signInError } = await authService.signIn({
        email: invitation.email,
        password: data.password,
      })

      if (signInError || !user) {
        toast({
          title: "로그인 실패",
          description: "회원가입은 완료되었으나 로그인에 실패했습니다. 다시 로그인해주세요.",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      toast({
        title: "환영합니다!",
        description: "계정이 생성되었습니다. 대시보드로 이동합니다.",
      })

      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1000)
    } catch {
      toast({
        title: "오류",
        description: "알 수 없는 오류가 발생했습니다.",
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">초대 정보 확인 중...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-none shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>초대가 유효하지 않습니다</CardTitle>
              <CardDescription className="mt-2">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/auth/login")} className="w-full">
                로그인 페이지로 이동
              </Button>
            </CardContent>
          </Card>
      </motion.div>
    )
  }

  const roleLabel =
    invitation.roleCode === "instructor" ? "강사" : "조교"

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
              <Users className="h-8 w-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl">초대 수락</CardTitle>
            <CardDescription className="mt-2">
              {invitation.email}님을 {roleLabel}로 초대합니다
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/5 p-4 text-center text-sm text-muted-foreground">
                계정을 생성하면 학원의 {roleLabel}로 활동할 수 있습니다.
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" placeholder="홍길동" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    placeholder="8자 이상 입력"
                    {...register("password")}
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
                    {...register("confirmPassword")}
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "계정 생성 중..." : "초대 수락 및 계정 생성"}
              </Button>
            </CardContent>
          </form>
        </Card>
    </motion.div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
