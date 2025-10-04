'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { GRADES, generateStudentCode } from '@/lib/constants'

const studentSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional(),
  grade: z.string().min(1, '학년을 선택해주세요'),
  school: z.string().optional(),
  emergencyContact: z.string().min(1, '비상 연락처를 입력해주세요'),
  notes: z.string().optional(),
})

type StudentFormValues = z.infer<typeof studentSchema>

export default function NewStudentPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
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

      // 1. public.users에 사용자 레코드 생성 (이름 저장을 위해 항상 생성)
      const { data: newUser, error: publicUserError } = await supabase
        .from('users')
        .insert({
          tenant_id: currentUser.tenantId,
          email: data.email || null,
          name: data.name,
          phone: data.phone || null,
          role_code: 'student',
        })
        .select()
        .maybeSingle()

      if (publicUserError) {
        console.error('public.users 생성 실패:', publicUserError)
        throw new Error(`사용자 레코드를 생성할 수 없습니다: ${publicUserError.message}`)
      }

      if (!newUser) {
        throw new Error('사용자 레코드 생성 실패')
      }

      const userId = newUser.id

      // 2. students 테이블에 학생 정보 저장
      const studentCode = generateStudentCode()

      const { error: studentError } = await supabase
        .from('students')
        .insert({
          tenant_id: currentUser.tenantId,
          user_id: userId,
          student_code: studentCode,
          grade: data.grade,
          school: data.school || null,
          emergency_contact: data.emergencyContact,
          notes: data.notes || null,
        })

      if (studentError) throw studentError

      toast({
        title: '학생 추가 완료',
        description: `${data.name} 학생이 추가되었습니다. (학생 코드: ${studentCode})`,
      })

      router.push('/students')
      router.refresh()
    } catch (error: any) {
      console.error('학생 추가 오류:', error)
      toast({
        title: '학생 추가 실패',
        description: error.message || '학생을 추가하는 중 오류가 발생했습니다.',
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">학생 추가</h1>
            <p className="text-muted-foreground">새로운 학생 정보를 입력하세요</p>
          </div>
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
