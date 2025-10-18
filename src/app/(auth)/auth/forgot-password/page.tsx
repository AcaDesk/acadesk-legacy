"use client"

import { useState } from "react"
import Link from "next/link"
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
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createResetPasswordUseCase } from "@/application/factories/authUseCaseFactory.client"

const forgotPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true)
    try {
      const resetPasswordUseCase = createResetPasswordUseCase()
      const { error } = await resetPasswordUseCase.execute({ email: data.email })

      if (error) {
        toast({
          title: "이메일 전송 실패",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setIsEmailSent(true)
      toast({
        title: "이메일 전송 완료",
        description: "비밀번호 재설정 링크를 이메일로 보냈습니다.",
      })
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

  if (isEmailSent) {
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
              <Mail className="h-8 w-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl">이메일을 확인하세요</CardTitle>
            <CardDescription className="mt-2">
              <strong>{getValues("email")}</strong>로
              <br />
              비밀번호 재설정 링크를 보냈습니다.
              <br />
              <br />
              이메일을 받지 못하셨나요? 스팸 폴더를 확인해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => setIsEmailSent(false)}
            >
              다시 시도
            </Button>
            <Link href="/auth/login">
              <Button variant="ghost" className="w-full" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                로그인으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    )
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
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Mail className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
          <CardDescription className="mt-2">
            가입하신 이메일 주소를 입력하시면
            <br />
            비밀번호 재설정 링크를 보내드립니다.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  전송 중...
                </>
              ) : (
                "재설정 링크 보내기"
              )}
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" className="w-full" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                로그인으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  )
}
