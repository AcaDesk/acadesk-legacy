/**
 * Owner Setup Page - OWNER_SETUP_REQUIRED 상태 처리
 *
 * 원장 학원 설정 마법사
 * - 학원명, 주소, 연락처 입력
 * - Server Action으로 테넌트 생성 및 설정
 * - 성공 시 /dashboard로 이동
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'motion/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { GraduationCap, CheckCircle, Loader2 } from 'lucide-react'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { completeOwnerOnboarding } from '@/app/actions/onboarding'
import { useToast } from '@/hooks/use-toast'

const academySetupSchema = z.object({
  academyName: z.string().min(2, '학원명은 2자 이상이어야 합니다.'),
  academyAddress: z.string().optional(),
  academyPhone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 연락처 형식이 아닙니다 (예: 010-1234-5678)')
    .optional()
    .or(z.literal('')),
})

type AcademySetupFormValues = z.infer<typeof academySetupSchema>

export default function OwnerSetupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AcademySetupFormValues>({
    resolver: zodResolver(academySetupSchema),
  })

  // 프로그레스 시뮬레이션
  useEffect(() => {
    if (!isSubmitting) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 15
      })
    }, 400)

    return () => clearInterval(interval)
  }, [isSubmitting])

  // 전화번호 자동 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    const limited = numbers.slice(0, 11)

    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`
    } else if (limited.length <= 10) {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setValue('academyPhone', formatted)
  }

  const onSubmit = async (data: AcademySetupFormValues) => {
    setIsSubmitting(true)
    setProgress(0)

    try {
      // ✅ Server Action 호출 (service_role 사용)
      const result = await completeOwnerOnboarding({
        academyName: data.academyName,
        timezone: 'Asia/Seoul',
        settings: {
          address: data.academyAddress,
          phone: data.academyPhone,
        },
      })

      if (!result.success) {
        toast({
          title: '설정 실패',
          description: result.error || '학원 설정 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      // 성공 메시지 표시
      toast({
        title: '설정 완료',
        description: '학원 설정이 완료되었습니다. 대시보드로 이동합니다.',
      })

      // 잠시 후 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error) {
      console.error('[OwnerSetupPage] Submit error:', error)
      toast({
        title: '오류',
        description: '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  // 제출 중일 때 로딩 화면 표시
  if (isSubmitting) {
    return (
      <AuthLoadingState
        stage="학원 설정 중"
        message="학원 정보를 저장하고 있습니다"
        progress={progress}
        icon={<GraduationCap className="h-8 w-8 text-primary" />}
        completedSteps={
          progress >= 50
            ? ['학원 정보 검증', '데이터베이스 생성']
            : progress >= 30
            ? ['학원 정보 검증']
            : []
        }
        totalSteps={3}
      />
    )
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
            <CardTitle className="text-2xl">학원 정보 입력</CardTitle>
            <CardDescription className="mt-2">
              마지막 단계입니다! 학원 기본 정보를 입력해주세요
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyName" className="text-base font-semibold">
                    학원명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="academyName"
                    placeholder="예) 서울영어학원"
                    {...register('academyName')}
                    className="h-11"
                    disabled={isSubmitting}
                  />
                  {errors.academyName && (
                    <p className="text-sm text-destructive">
                      {errors.academyName.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    학부모와 학생들에게 보여질 학원 이름입니다
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyAddress" className="text-base font-semibold">
                    학원 주소{' '}
                    <span className="text-muted-foreground text-sm font-normal">(선택)</span>
                  </Label>
                  <Input
                    id="academyAddress"
                    placeholder="예) 서울시 강남구 테헤란로 123"
                    {...register('academyAddress')}
                    className="h-11"
                    disabled={isSubmitting}
                  />
                  {errors.academyAddress && (
                    <p className="text-sm text-destructive">
                      {errors.academyAddress.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    학원 찾기 및 안내문에 사용됩니다
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <Label htmlFor="academyPhone" className="text-base font-semibold">
                    학원 연락처{' '}
                    <span className="text-muted-foreground text-sm font-normal">(선택)</span>
                  </Label>
                  <Input
                    id="academyPhone"
                    placeholder="010-1234-5678"
                    {...register('academyPhone')}
                    onChange={handlePhoneChange}
                    className="h-11"
                    type="tel"
                    inputMode="numeric"
                    disabled={isSubmitting}
                  />
                  {errors.academyPhone && (
                    <p className="text-sm text-destructive">
                      {errors.academyPhone.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    학부모 문의 시 표시되는 대표 연락처입니다
                  </p>
                </motion.div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-2">
                      💡 설정 완료 후 바로 시작할 수 있어요
                    </p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>학생 및 학부모 등록 관리</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>출석 및 성적 기록</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>수업 일정 및 시간표 관리</span>
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>학생별 TODO 관리</span>
                      </li>
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
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      설정 중...
                    </>
                  ) : (
                    '완료하고 시작하기'
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
