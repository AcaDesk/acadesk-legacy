'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { GRADES } from '@/lib/constants'
import { getErrorMessage } from '@/lib/error-handlers'

const studentSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional(),
  grade: z.string().min(1, '학년을 선택해주세요'),
  school: z.string().optional(),
  emergencyContact: z.string().min(1, '비상 연락처를 입력해주세요'),
  notes: z.string().optional(),
  kioskPin: z.string()
    .regex(/^\d{4}$/, '4자리 숫자를 입력해주세요')
    .optional()
    .or(z.literal('')),
})

type StudentFormValues = z.infer<typeof studentSchema>

export default function NewStudentPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
  })

  const selectedGrade = watch('grade')

  const onSubmit = async (data: StudentFormValues) => {
    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          grade: data.grade,
          school: data.school,
          emergencyContact: data.emergencyContact,
          notes: data.notes,
          kioskPin: data.kioskPin,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '학생 추가에 실패했습니다')
      }

      const result = await response.json()

      toast({
        title: '학생 추가 완료',
        description: `${data.name} 학생이 추가되었습니다. (학생 코드: ${result.studentCode})`,
      })

      router.push('/students')
      router.refresh()
    } catch (error) {
      toast({
        title: '학생 추가 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  if (!currentUser) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/students')}
            className="hover:text-foreground transition-colors"
          >
            학생 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">새 학생</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">학생 추가</h1>
          <p className="text-muted-foreground mt-1">새로운 학생 정보를 입력하세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>학생 정보</CardTitle>
            <CardDescription>
              학생의 기본 정보를 입력해주세요. 필수 항목은 * 표시되어 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">학년 *</Label>
                  <Select onValueChange={(value) => setValue('grade', value)} value={selectedGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grade && (
                    <p className="text-sm text-destructive">{errors.grade.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school">학교</Label>
                  <Input
                    id="school"
                    placeholder="서울초등학교"
                    {...register('school')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    placeholder="010-0000-0000"
                    {...register('phone')}
                  />
                </div>
              </div>

              {/* 연락 정보 */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">비상 연락처 *</Label>
                  <Input
                    id="emergencyContact"
                    placeholder="010-0000-0000"
                    {...register('emergencyContact')}
                  />
                  {errors.emergencyContact && (
                    <p className="text-sm text-destructive">{errors.emergencyContact.message}</p>
                  )}
                </div>
              </div>

              {/* 메모 */}
              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  placeholder="학생에 대한 추가 정보를 입력하세요..."
                  rows={4}
                  className="resize-none"
                  {...register('notes')}
                />
              </div>

              {/* 키오스크 PIN */}
              <div className="space-y-2">
                <Label htmlFor="kioskPin">키오스크 PIN (4자리)</Label>
                <Input
                  id="kioskPin"
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  {...register('kioskPin')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setValue('kioskPin', value)
                  }}
                />
                {errors.kioskPin && (
                  <p className="text-sm text-destructive">{errors.kioskPin.message}</p>
                )}
                <p className="text-xs text-muted-foreground">학생이 키오스크 모드에서 TODO를 확인하기 위한 4자리 PIN입니다. 미입력 시 키오스크 접근 불가능합니다.</p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 justify-end">
                <Link href="/students">
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? '저장 중...' : '학생 추가'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
