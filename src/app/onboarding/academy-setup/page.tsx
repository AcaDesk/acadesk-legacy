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
import { GraduationCap, CheckCircle } from "lucide-react"
import { OnboardingService } from "@/services/onboarding.service"
import { authService } from "@/services/auth/auth.service"
import { useToast } from "@/hooks/use-toast"

const academySetupSchema = z.object({
  academyName: z.string().min(2, "학원명은 2자 이상이어야 합니다."),
  academyAddress: z.string().optional(),
  academyPhone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, "올바른 연락처 형식이 아닙니다.")
    .optional()
    .or(z.literal("")),
})

type AcademySetupFormValues = z.infer<typeof academySetupSchema>

export default function AcademySetupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcademySetupFormValues>({
    resolver: zodResolver(academySetupSchema),
  })

  const onSubmit = async (data: AcademySetupFormValues) => {
    setIsSubmitting(true)
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        toast({
          title: "오류",
          description: "로그인 정보를 찾을 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      const { success, error } = await OnboardingService.completeAcademySetup(
        user.id,
        {
          academyName: data.academyName,
          academyAddress: data.academyAddress,
          academyPhone: data.academyPhone,
          timezone: "Asia/Seoul",
        }
      )

      if (!success) {
        toast({
          title: "설정 실패",
          description: error || "학원 설정에 실패했습니다.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "설정 완료",
        description: "학원 설정이 완료되었습니다. 대시보드로 이동합니다.",
      })

      // 잠시 후 대시보드로 이동
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1000)
    } catch (_error) {
      toast({
        title: "오류",
        description: "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
            >
              <GraduationCap className="h-8 w-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl">학원 설정</CardTitle>
            <CardDescription className="mt-2">
              학원 정보를 입력하여 시작하세요
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  1
                </div>
                <div className="h-px w-12 bg-primary" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  2
                </div>
                <div className="h-px w-12 bg-muted" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  3
                </div>
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyName">
                    학원명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="academyName"
                    placeholder="예) 서울영어학원"
                    {...register("academyName")}
                  />
                  {errors.academyName && (
                    <p className="text-sm text-destructive">
                      {errors.academyName.message}
                    </p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyAddress">학원 주소</Label>
                  <Input
                    id="academyAddress"
                    placeholder="예) 서울시 강남구 테헤란로 123"
                    {...register("academyAddress")}
                  />
                  {errors.academyAddress && (
                    <p className="text-sm text-destructive">
                      {errors.academyAddress.message}
                    </p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyPhone">학원 연락처</Label>
                  <Input
                    id="academyPhone"
                    placeholder="010-0000-0000"
                    {...register("academyPhone")}
                  />
                  {errors.academyPhone && (
                    <p className="text-sm text-destructive">
                      {errors.academyPhone.message}
                    </p>
                  )}
                </motion.div>
              </div>

              <div className="rounded-lg bg-primary/5 p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      설정 완료 후 가능한 작업:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>학생 및 학부모 등록</li>
                      <li>수업 및 시간표 관리</li>
                      <li>출석 및 성적 기록</li>
                      <li>직원 초대 및 권한 관리</li>
                    </ul>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "설정 중..." : "설정 완료 및 시작하기"}
                </Button>
              </motion.div>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
