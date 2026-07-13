'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
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
import { getClassById, updateClass, getInstructors } from '@/app/actions/classes'
import { getErrorMessage } from '@/lib/error-handlers'
import { queryKeys } from '@/lib/query-keys'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { LoadingState } from '@/components/ui/loading-state'
import { SubjectSelector } from '@/components/features/common/subject-selector'
import { GradeSelector } from '@/components/features/common/grade-selector'
import { DayOfWeekPicker } from '@/components/features/classes/day-of-week-picker'
import { TimePicker } from '@ui/time-picker'

const classSchema = z.object({
  name: z.string().min(1, '수업명은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  instructorId: z.string().optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  active: z.boolean(),
  scheduleDays: z.array(z.string()).optional(),
  scheduleStartTime: z.string().optional(),
  scheduleEndTime: z.string().optional(),
})

type ClassFormData = z.infer<typeof classSchema>

interface Instructor {
  id: string
  name: string
  email: string | null
}

export default function EditClassPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formSeeded, setFormSeeded] = useState(false)

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
      scheduleDays: [],
      scheduleStartTime: '',
      scheduleEndTime: '',
    },
  })

  const classQuery = useQuery({
    queryKey: queryKeys.classes.detail(params.id),
    queryFn: async () => {
      const result = await getClassById(params.id)
      if (!result.success || !result.data) {
        throw new Error(result.error || '수업 정보를 불러올 수 없습니다')
      }
      return result.data
    },
    enabled: !!params.id,
  })

  const instructorsQuery = useQuery({
    queryKey: queryKeys.staff.instructors(),
    queryFn: async (): Promise<Instructor[]> => {
      const result = await getInstructors()
      if (!result.success || !result.data) {
        throw new Error(result.error || '강사 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
  })
  const instructors = instructorsQuery.data ?? []
  const loading = classQuery.isPending

  // 서버 데이터로 폼을 1회만 시드 — 재조회가 편집 중인 값을 덮어쓰지 않도록 보호
  useEffect(() => {
    const classData = classQuery.data
    if (!classData || formSeeded) return
    const schedule = classData.schedule as { days?: string[], startTime?: string, endTime?: string } | null
    form.reset({
      name: classData.name || '',
      description: classData.description || '',
      subject: classData.subject || '',
      gradeLevel: classData.grade_level || '',
      instructorId: classData.instructor_id || '',
      room: classData.room || '',
      capacity: classData.capacity ?? undefined,
      active: classData.active ?? true,
      scheduleDays: schedule?.days ?? [],
      scheduleStartTime: schedule?.startTime ?? '',
      scheduleEndTime: schedule?.endTime ?? '',
    })
    setFormSeeded(true)
  }, [classQuery.data, formSeeded, form])

  useEffect(() => {
    if (classQuery.isError) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(classQuery.error),
        variant: 'destructive',
      })
      router.push('/classes')
    }
  }, [classQuery.isError, classQuery.error, toast, router])

  async function onSubmit(data: ClassFormData) {
    setIsSubmitting(true)

    try {
      const result = await updateClass({
        id: params.id,
        name: data.name,
        description: data.description,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        instructorId: data.instructorId || undefined,
        room: data.room,
        capacity: data.capacity,
        active: data.active,
        schedule: (data.scheduleDays ?? []).length
          ? { days: data.scheduleDays, startTime: data.scheduleStartTime, endTime: data.scheduleEndTime }
          : undefined,
      })

      if (!result.success) {
        throw new Error(result.error || '수업 수정에 실패했습니다')
      }

      toast({
        title: '수업 수정 완료',
        description: `${data.name} 수업이 수정되었습니다.`,
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(params.id) })
      router.push(`/classes/${params.id}`)
    } catch (error) {
      console.error('Error updating class:', error)
      toast({
        title: '수업 수정 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
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
            <Button asChild variant="ghost" size="icon">
              <Link href={`/classes/${params.id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>수업 수정</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                수업 정보를 수정하세요
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section aria-label="수업 수정 폼" {...PAGE_ANIMATIONS.getSection(0)}>
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
                    <SubjectSelector
                      value={form.watch('subject') || ''}
                      onChange={(value) => form.setValue('subject', value)}
                      placeholder="과목 선택"
                      showColor={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">학년</Label>
                    <GradeSelector
                      value={form.watch('gradeLevel') || ''}
                      onChange={(value) => form.setValue('gradeLevel', value)}
                      placeholder="학년 선택"
                    />
                  </div>
                </div>

                {/* Instructor */}
                <div className="space-y-2">
                  <Label htmlFor="instructorId">담당 강사</Label>
                  <Select
                    value={form.watch('instructorId') || undefined}
                    onValueChange={(value) => {
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

                {/* Schedule */}
                <div className="space-y-3">
                  <Label>수업 일정</Label>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">요일</p>
                      <DayOfWeekPicker
                        value={form.watch('scheduleDays') || []}
                        onChange={(days) => form.setValue('scheduleDays', days)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">시작 시간</p>
                        <TimePicker
                          value={form.watch('scheduleStartTime') || ''}
                          onChange={(t) => form.setValue('scheduleStartTime', t)}
                          placeholder="시작 시간"
                        />
                      </div>
                      <span className="mt-5 text-muted-foreground">~</span>
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">종료 시간</p>
                        <TimePicker
                          value={form.watch('scheduleEndTime') || ''}
                          onChange={(t) => form.setValue('scheduleEndTime', t)}
                          placeholder="종료 시간"
                        />
                      </div>
                    </div>
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
              <Button asChild variant="outline">
                <Link href={`/classes/${params.id}`}>
                  취소
                </Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>저장 중...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    변경사항 저장
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
