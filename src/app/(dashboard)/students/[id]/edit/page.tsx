'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Textarea } from '@ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { getErrorMessage } from '@/lib/error-handlers'
import { getStudentDetail, updateStudent } from '@/app/actions/students'
import { getTenantCodes } from '@/app/actions/tenant'
import { GradeSelector } from '@/components/features/common/grade-selector'
import { SchoolSelector } from '@/components/features/common/school-selector'

const studentSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional(),
  studentPhone: z.string().optional(),
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

interface StudentData {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  student_phone: string | null
  emergency_contact: string | null
  notes: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
}

export default function EditStudentPage() {
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [schools, setSchools] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

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

  useEffect(() => {
    if (params.id) {
      loadStudentData(params.id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    loadSchools()
  }, [])

  async function loadSchools() {
    try {
      const result = await getTenantCodes('school')

      if (!result.success || !result.data) {
        throw new Error(result.error || '학교 목록 조회 실패')
      }

      // 데이터가 있으면 사용, 없으면 기본 학교 목록 사용
      if (result.data.length > 0) {
        setSchools(result.data)
      } else {
        // tenant_codes 테이블이 비어있거나 없는 경우 기본 목록 사용
        const { DEFAULT_SCHOOLS } = await import('@/lib/constants')
        setSchools([...DEFAULT_SCHOOLS])
      }
    } catch (error) {
      // 테이블이 존재하지 않거나 RLS 에러 등이 발생하면 기본 목록 사용
      console.warn('tenant_codes 테이블을 사용할 수 없습니다. 기본 학교 목록을 사용합니다:', error)
      const { DEFAULT_SCHOOLS } = await import('@/lib/constants')
      setSchools([...DEFAULT_SCHOOLS])
    }
  }

  async function loadStudentData(studentId: string) {
    try {
      setInitialLoading(true)
      const result = await getStudentDetail(studentId)

      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 정보를 찾을 수 없습니다.')
      }

      const data = result.data.student

      const normalized: StudentData = {
        id: data.id as string,
        student_code: data.student_code as string,
        grade: data.grade,
        school: data.school,
        student_phone: data.student_phone,
        emergency_contact: data.emergency_contact,
        notes: data.notes,
        users: data.users
          ? {
              name: data.users.name,
              email: data.users.email,
              phone: data.users.phone,
            }
          : null,
      }

      setStudent(normalized)

      // Populate form fields
      if (data.users) {
        setValue('name', data.users.name)
        setValue('email', data.users.email || '')
        setValue('phone', data.users.phone || '')
      }
      setValue('studentPhone', data.student_phone || '')
      setValue('grade', data.grade || '')
      setValue('school', data.school || '')
      setValue('emergencyContact', data.emergency_contact || '')
      setValue('notes', data.notes || '')
      // kiosk_pin은 보안상 조회되지 않으므로 빈 값으로 설정
      setValue('kioskPin', '')
    } catch (error) {
      toast({
        title: '학생 조회 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
      router.push('/students')
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: StudentFormValues) => {
    if (!student || !student.users) return

    setLoading(true)
    try {
      const result = await updateStudent(student.id, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        student_phone: data.studentPhone || null,
        grade: data.grade,
        school: data.school || null,
        emergency_contact: data.emergencyContact,
        notes: data.notes || null,
        kiosk_pin: data.kioskPin || null,
      })

      if (!result.success) {
        throw new Error(result.error || '학생 정보 수정에 실패했습니다')
      }

      toast({
        title: '학생 정보 수정 완료',
        description: `${data.name} 학생의 정보가 수정되었습니다.`,
      })

      router.push(`/students/${student.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: '학생 수정 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  if (!student) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">학생을 찾을 수 없습니다.</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">학생 정보 수정</h1>
          <p className="text-muted-foreground mt-1">학번: {student.student_code}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>학생 정보</CardTitle>
            <CardDescription>
              학생의 기본 정보를 수정해주세요. 필수 항목은 * 표시되어 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">기본 정보</TabsTrigger>
                  <TabsTrigger value="contact">연락처</TabsTrigger>
                  <TabsTrigger value="other">기타</TabsTrigger>
                </TabsList>

                {/* Tab 1: 기본 정보 */}
                <TabsContent value="basic" className="space-y-6 mt-6">
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
                  <GradeSelector
                    value={selectedGrade}
                    onChange={(value) => setValue('grade', value)}
                    placeholder="학년 선택"
                  />
                  {errors.grade && (
                    <p className="text-sm text-destructive">{errors.grade.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school">학교</Label>
                  <SchoolSelector
                    value={watch('school') || ''}
                    onChange={(value) => setValue('school', value)}
                    schools={schools}
                    placeholder="학교 선택 또는 입력..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentPhone">학생 본인 연락처</Label>
                  <Input
                    id="studentPhone"
                    placeholder="010-0000-0000"
                    {...register('studentPhone')}
                  />
                  <p className="text-xs text-muted-foreground">학생 본인의 휴대전화 번호</p>
                </div>
              </div>
                </TabsContent>

                {/* Tab 2: 연락처 */}
                <TabsContent value="contact" className="space-y-6 mt-6">
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
                </TabsContent>

                {/* Tab 3: 기타 */}
                <TabsContent value="other" className="space-y-6 mt-6">
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
                </TabsContent>
              </Tabs>

              {/* 버튼 - Tabs 밖으로 */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
