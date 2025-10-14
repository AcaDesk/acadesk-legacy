"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Phone, Building2, User, CheckCircle2, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

const preRegistrationSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, "올바른 연락처 형식이 아닙니다."),
  academyName: z.string().min(2, "학원명은 2자 이상이어야 합니다."),
  agreedToMarketing: z.boolean().refine((val) => val === true, {
    message: "마케팅 정보 수신에 동의해주세요.",
  }),
})

type PreRegistrationFormValues = z.infer<typeof preRegistrationSchema>

export function PreRegistrationSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PreRegistrationFormValues>({
    resolver: zodResolver(preRegistrationSchema),
    defaultValues: {
      agreedToMarketing: false,
    },
  })

  const onSubmit = async (data: PreRegistrationFormValues) => {
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // pre_registrations 테이블에 저장
      const { error } = await supabase.from("pre_registrations").insert([
        {
          name: data.name,
          email: data.email,
          phone: data.phone,
          academy_name: data.academyName,
          agreed_to_marketing: data.agreedToMarketing,
          registered_at: new Date().toISOString(),
        },
      ])

      if (error) {
        // 이미 등록된 이메일인 경우
        if (error.code === "23505") {
          toast({
            title: "이미 등록된 이메일입니다",
            description: "다른 이메일로 시도해주세요.",
            variant: "destructive",
          })
          return
        }

        throw error
      }

      setIsSuccess(true)
      reset()

      toast({
        title: "사전 등록 완료!",
        description: "출시 소식을 가장 먼저 알려드리겠습니다.",
      })
    } catch (error) {
      console.error("Pre-registration error:", error)
      toast({
        title: "오류가 발생했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <section
        id="pre-registration"
        className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-background to-orange-50 py-24 dark:from-orange-950/20 dark:to-background"
      >
        <div className="container relative z-10 mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-4 text-4xl font-bold">등록 완료!</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              사전 등록이 완료되었습니다.
              <br />
              출시 소식을 이메일로 가장 먼저 알려드리겠습니다.
            </p>
            <Button
              onClick={() => setIsSuccess(false)}
              variant="outline"
              size="lg"
            >
              다시 등록하기
            </Button>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="pre-registration"
      className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-background to-orange-50 py-24 dark:from-orange-950/20 dark:to-background"
    >
      {/* 배경 장식 */}
      <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-900/10" />
      <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-900/10" />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          {/* 헤더 */}
          <div className="mb-12 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-medium"
            >
              <Mail className="h-4 w-4 text-orange-500" />
              출시 알림 신청
            </motion.div>
            <h2 className="mb-4 text-4xl font-bold">
              선착순 100명
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                평생 무료
              </span>
              로 이용하세요
            </h2>
            <p className="text-lg text-muted-foreground">
              사전 등록하시면 출시 소식을 가장 먼저 받아보실 수 있습니다.
            </p>
          </div>

          {/* 폼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="rounded-2xl border bg-card p-8 shadow-xl"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  이름
                </Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  disabled={isSubmitting}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  연락처
                </Label>
                <Input
                  id="phone"
                  placeholder="010-0000-0000"
                  disabled={isSubmitting}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* 학원명 */}
              <div className="space-y-2">
                <Label htmlFor="academyName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  학원명
                </Label>
                <Input
                  id="academyName"
                  placeholder="예) 서울학원"
                  disabled={isSubmitting}
                  {...register("academyName")}
                />
                {errors.academyName && (
                  <p className="text-sm text-destructive">
                    {errors.academyName.message}
                  </p>
                )}
              </div>

              {/* 마케팅 동의 */}
              <div className="flex items-start space-x-2 rounded-lg bg-muted/50 p-4">
                <Checkbox
                  id="marketing"
                  checked={watch("agreedToMarketing")}
                  onCheckedChange={(checked) =>
                    setValue("agreedToMarketing", checked as boolean)
                  }
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="marketing"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  출시 소식, 이벤트 및 마케팅 정보 수신에 동의합니다. (필수)
                </label>
              </div>
              {errors.agreedToMarketing && (
                <p className="text-sm text-destructive">
                  {errors.agreedToMarketing.message}
                </p>
              )}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-orange-500 text-base font-semibold hover:bg-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "무료로 사전 등록하기"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                사전 등록은 서비스 이용을 보장하지 않으며, 출시 알림 용도로만
                사용됩니다.
              </p>
            </form>
          </motion.div>

          {/* 혜택 안내 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-orange-500">100명</div>
              <p className="text-sm text-muted-foreground">선착순 평생 무료</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-orange-500">30%</div>
              <p className="text-sm text-muted-foreground">얼리버드 할인</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-orange-500">1:1</div>
              <p className="text-sm text-muted-foreground">무료 컨설팅</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
