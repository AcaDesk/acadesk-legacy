'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ChevronRight } from 'lucide-react'
import { GRADES } from '@/lib/constants'

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

interface StudentData {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  emergency_contact: string | null
  notes: string | null
  users: {
    id: string
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
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

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

  async function loadStudentData(studentId: string) {
    try {
      setInitialLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          grade,
          school,
          emergency_contact,
          notes,
          users (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('id', studentId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('Error fetching student:', error)
        throw error
      }

      if (!data) {
        throw new Error('학생 정보를 찾을 수 없습니다.')
      }

      setStudent(data as StudentData)

      // Populate form fields
      if (data.users) {
        setValue('name', data.users.name)
        setValue('email', data.users.email || '')
        setValue('phone', data.users.phone || '')
      }
      setValue('grade', data.grade || '')
      setValue('school', data.school || '')
      setValue('emergencyContact', data.emergency_contact || '')
      setValue('notes', data.notes || '')
    } catch (error: any) {
      console.error('학생 조회 오류:', error)
      toast({
        title: '학생 조회 실패',
        description: error.message || '학생 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
      router.push('/students')
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: StudentFormValues) => {
    if (!student) return

    setLoading(true)
    try {
      // 1. Update users table
      if (student.users) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
          })
          .eq('id', student.users.id)

        if (userError) {
          console.error('사용자 업데이트 오류:', userError)
          throw new Error(`사용자 정보를 업데이트할 수 없습니다: ${userError.message}`)
        }
      }

      // 2. Update students table
      const { error: studentError } = await supabase
        .from('students')
        .update({
          grade: data.grade,
          school: data.school || null,
          emergency_contact: data.emergencyContact,
          notes: data.notes || null,
        })
        .eq('id', student.id)

      if (studentError) {
        console.error('학생 업데이트 오류:', studentError)
        throw studentError
      }

      toast({
        title: '학생 정보 수정 완료',
        description: `${data.name} 학생의 정보가 수정되었습니다.`,
      })

      router.push(`/students/${student.id}`)
      router.refresh()
    } catch (error: any) {
      console.error('학생 수정 오류:', error)
      toast({
        title: '학생 수정 실패',
        description: error.message || '학생 정보를 수정하는 중 오류가 발생했습니다.',
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
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/students')}
            className="hover:text-foreground transition-colors"
          >
            학생 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => router.push(`/students/${student.id}`)}
            className="hover:text-foreground transition-colors"
          >
            {student.users?.name || '학생'}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">수정</span>
        </nav>

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
