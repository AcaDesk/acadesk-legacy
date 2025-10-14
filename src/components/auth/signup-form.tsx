"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, GraduationCap } from "lucide-react"
import { authService } from "@/services/auth/auth.service"
import { useToast } from "@/hooks/use-toast"

const signupSchema = z.object({
  academyName: z.string().min(2, "학원명은 2자 이상이어야 합니다."),
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, "올바른 연락처 형식이 아닙니다."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  confirmPassword: z.string(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "이용약관에 동의해주세요.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (custom: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.4,
    },
  }),
}

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
      agreedToTerms: false,
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await authService.signUp({
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
        academyName: data.academyName,
        role: "admin", // 원장으로 고정
      })

      if (error) {
        toast({
          title: "회원가입 실패",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "회원가입 성공",
        description: "이메일을 확인해주세요.",
      })

      router.push("/auth/login")
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <Card className="border-none pb-0 shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-1.5 pb-4 pt-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <GraduationCap className="h-8 w-8 text-primary" />
          </motion.div>
          <div className="flex flex-col items-center space-y-0.5">
            <h2 className="text-2xl font-semibold text-foreground">
              Acadesk 회원가입
            </h2>
            <p className="text-muted-foreground">
              학원 원장님 전용 가입 페이지입니다
            </p>
          </div>
        </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5 px-8">
              <div className="rounded-lg bg-primary/5 p-3 text-center text-sm text-muted-foreground">
                <strong className="text-foreground">학원 원장</strong>으로 가입합니다.
                <br />
                직원 초대는 가입 후 가능합니다.
              </div>

              <motion.div
                className="space-y-2"
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <Label htmlFor="academyName">학원명</Label>
                <Input
                  id="academyName"
                  placeholder="예) 서울학원"
                  {...register("academyName")}
                />
                {errors.academyName && (
                  <p className="text-sm text-destructive">
                    {errors.academyName.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="grid grid-cols-2 gap-4"
                custom={1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" placeholder="홍길동" {...register("name")} />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    placeholder="010-0000-0000"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </motion.div>

              <motion.div
                className="space-y-2"
                custom={2}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </motion.div>

              <motion.div
                className="space-y-2"
                custom={3}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
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
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
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
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="space-y-2"
                custom={4}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
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
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
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
              </motion.div>

              <motion.div
                className="flex items-start space-x-2"
                custom={5}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <Checkbox
                  id="terms"
                  className="mt-1"
                  checked={watch("agreedToTerms")}
                  onCheckedChange={(checked) =>
                    setValue("agreedToTerms", checked as boolean)
                  }
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  <Link href="/terms" className="text-primary hover:underline">
                    이용약관
                  </Link>
                  과{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    개인정보처리방침
                  </Link>
                  에 동의합니다
                </label>
              </motion.div>
              {errors.agreedToTerms && (
                <p className="text-sm text-destructive">
                  {errors.agreedToTerms.message}
                </p>
              )}

              <motion.div
                custom={6}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "무료 계정 생성"}
                </Button>
              </motion.div>
            </CardContent>
          </form>
          <CardFooter className="flex justify-center border-t py-4!">
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
  )
}
