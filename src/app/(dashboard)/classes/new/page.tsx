'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Checkbox } from '@ui/checkbox'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PAGE_LAYOUT, TEXT_STYLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { createClass, getInstructors } from '@/app/actions/classes'
import { getErrorMessage } from '@/lib/error-handlers'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { LoadingState } from '@/components/ui/loading-state'

const classSchema = z.object({
  name: z.string().min(1, '수업명은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  instructorId: z.string().optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  active: z.boolean(),
})

type ClassFormData = z.infer<typeof classSchema>

interface Instructor {
  id: string
  name: string
  email: string | null
}

export default function NewClassPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loadingInstructors, setLoadingInstructors] = useState(true)

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: '',
      gradeLevel: '',
      instructorId: '',
      room: '',
      capacity: undefined,
      active: true,
    },
  })

  useEffect(() => {
    loadInstructors()
  }, [])

  async function loadInstructors() {
    try {
      setLoadingInstructors(true)
      const result = await getInstructors()

      if (!result.success || !result.data) {
        throw new Error(result.error || '강사 목록을 불러올 수 없습니다')
      }

      setInstructors(result.data)
    } catch (error) {
      console.error('Error loading instructors:', error)
      toast({
        title: '강사 목록 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoadingInstructors(false)
    }
  }

  async function onSubmit(data: ClassFormData) {
    setIsSubmitting(true)

    try {
      const result = await createClass({
        name: data.name,
        description: data.description,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        instructorId: data.instructorId || undefined,
        room: data.room,
        capacity: data.capacity,
        active: data.active,
      })

      if (!result.success) {
        throw new Error(result.error || '수업 생성에 실패했습니다')
      }

      toast({
        title: '수업 생성 완료',
        description: `${data.name} 수업이 생성되었습니다.`,
      })

      router.push('/classes')
    } catch (error) {
      console.error('Error creating class:', error)
      toast({
        title: '수업 생성 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingInstructors) {
    return (
      <PageWrapper>
        <LoadingState variant="card" message="수업 정보를 불러오는 중..." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
          <div className="flex items-center gap-4 mb-6">
            <Link href="/classes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>새 수업 추가</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                새로운 수업 정보를 입력하세요
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section aria-label="수업 등록 폼" {...PAGE_ANIMATIONS.getSection(0)}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>수업 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    수업명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="예: 초등 수학 A반"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">수업 설명</Label>
                  <Textarea
                    id="description"
                    placeholder="수업에 대한 설명을 입력하세요"
                    rows={3}
                    {...form.register('description')}
                  />
                </div>

                {/* Subject and Grade Level */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">과목</Label>
                    <Input
                      id="subject"
                      placeholder="예: 수학, 영어"
                      {...form.register('subject')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">학년</Label>
                    <Input
                      id="gradeLevel"
                      placeholder="예: 초3, 중1"
                      {...form.register('gradeLevel')}
                    />
                  </div>
                </div>

                {/* Instructor */}
                <div className="space-y-2">
                  <Label htmlFor="instructorId">담당 강사</Label>
                  <Select
                    value={form.watch('instructorId') || undefined}
                    onValueChange={(value) => {
                      // "none" 값이면 빈 문자열로 저장
                      form.setValue('instructorId', value === 'none' ? '' : value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="강사 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name}
                          {instructor.email && ` (${instructor.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room and Capacity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room">강의실</Label>
                    <Input
                      id="room"
                      placeholder="예: A-101"
                      {...form.register('room')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">정원</Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="예: 20"
                      {...form.register('capacity', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={form.watch('active')}
                    onCheckedChange={(checked) =>
                      form.setValue('active', checked as boolean)
                    }
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    활성 상태 (수업 운영 중)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-6">
              <Link href="/classes">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>생성 중...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    수업 생성
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </PageWrapper>
  )
}
