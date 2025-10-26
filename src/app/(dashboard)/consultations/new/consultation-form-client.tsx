'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Checkbox } from '@ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { ArrowLeft, Calendar as CalendarIcon, Save } from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PAGE_LAYOUT, TEXT_STYLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createConsultation, updateConsultation } from '@/app/actions/consultations'

const consultationSchema = z.object({
  studentId: z.string().min(1, '학생을 선택해주세요'),
  consultationDate: z.date(),
  consultationTime: z.string().regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다'),
  consultationType: z.enum(['parent_meeting', 'phone_call', 'video_call', 'in_person']),
  durationMinutes: z.number().int().positive().optional(),
  title: z.string().min(1, '상담 제목을 입력해주세요'),
  summary: z.string().optional(),
  outcome: z.string().optional(),
  followUpRequired: z.boolean(),
  nextConsultationDate: z.date().optional(),
})

type ConsultationFormData = z.infer<typeof consultationSchema>

type Student = {
  id: string
  name: string
  grade: string
}

type Consultation = {
  id: string
  student_id: string
  consultation_date: string
  consultation_type: string
  duration_minutes: number | null
  title: string
  summary: string | null
  outcome: string | null
  follow_up_required: boolean
  next_consultation_date: string | null
}

interface ConsultationFormClientProps {
  students: Student[]
  mode: 'create' | 'edit'
  consultation?: Consultation
}

export function ConsultationFormClient({
  students,
  mode,
  consultation,
}: ConsultationFormClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Extract time from consultation_date if editing
  const initialTime = consultation
    ? formatDate(new Date(consultation.consultation_date), 'HH:mm')
    : '14:00'

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      studentId: consultation?.student_id || '',
      consultationDate: consultation
        ? new Date(consultation.consultation_date)
        : undefined,
      consultationTime: initialTime,
      consultationType: (consultation?.consultation_type as any) || 'in_person',
      durationMinutes: consultation?.duration_minutes || undefined,
      title: consultation?.title || '',
      summary: consultation?.summary || '',
      outcome: consultation?.outcome || '',
      followUpRequired: consultation?.follow_up_required || false,
      nextConsultationDate: consultation?.next_consultation_date
        ? new Date(consultation.next_consultation_date)
        : undefined,
    },
  })

  const followUpRequired = form.watch('followUpRequired')

  async function onSubmit(data: ConsultationFormData) {
    setIsSubmitting(true)

    try {
      // Combine date and time
      const dateTime = new Date(data.consultationDate)
      const [hours, minutes] = data.consultationTime.split(':').map(Number)
      dateTime.setHours(hours, minutes, 0, 0)

      if (mode === 'create') {
        const result = await createConsultation({
          studentId: data.studentId,
          consultationDate: dateTime.toISOString(),
          consultationType: data.consultationType,
          durationMinutes: data.durationMinutes,
          title: data.title,
          summary: data.summary,
          outcome: data.outcome,
          followUpRequired: data.followUpRequired,
          nextConsultationDate: data.nextConsultationDate?.toISOString(),
        })

        console.log('[ConsultationForm] createConsultation result:', result)

        if (!result.success) {
          throw new Error(result.error || '상담 기록 생성 실패')
        }

        if (!result.data?.id) {
          console.error('[ConsultationForm] No consultation ID in result:', result)
          throw new Error('상담 ID를 받지 못했습니다')
        }

        toast({
          title: '생성 완료',
          description: '상담 기록이 생성되었습니다.',
        })

        console.log('[ConsultationForm] Navigating to:', `/consultations/${result.data.id}`)
        router.push(`/consultations/${result.data.id}`)
      } else if (consultation) {
        const result = await updateConsultation({
          id: consultation.id,
          consultationDate: dateTime.toISOString(),
          consultationType: data.consultationType,
          durationMinutes: data.durationMinutes,
          title: data.title,
          summary: data.summary,
          outcome: data.outcome,
          followUpRequired: data.followUpRequired,
          nextConsultationDate: data.nextConsultationDate?.toISOString(),
        })

        if (!result.success) {
          throw new Error(result.error || '상담 기록 수정 실패')
        }

        toast({
          title: '수정 완료',
          description: '상담 기록이 수정되었습니다.',
        })

        router.push(`/consultations/${consultation.id}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: mode === 'create' ? '생성 오류' : '수정 오류',
        description:
          error instanceof Error
            ? error.message
            : '상담 기록을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href={mode === 'edit' && consultation ? `/consultations/${consultation.id}` : '/consultations'}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>
                {mode === 'create' ? '새 상담 기록' : '상담 기록 수정'}
              </h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                {mode === 'create'
                  ? '상담 정보를 입력하여 새 기록을 생성합니다'
                  : '상담 정보를 수정합니다'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>상담 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Student Selection */}
                <div className="space-y-2">
                  <Label htmlFor="studentId">
                    학생 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.watch('studentId')}
                    onValueChange={(value) => form.setValue('studentId', value)}
                    disabled={mode === 'edit'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="학생 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.grade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.studentId && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.studentId.message}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    상담 제목 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="예: 1학기 학습 성과 상담"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                {/* Consultation Type */}
                <div className="space-y-2">
                  <Label htmlFor="consultationType">
                    상담 유형 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.watch('consultationType')}
                    onValueChange={(value) =>
                      form.setValue(
                        'consultationType',
                        value as 'parent_meeting' | 'phone_call' | 'video_call' | 'in_person'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">대면 상담</SelectItem>
                      <SelectItem value="phone_call">전화 상담</SelectItem>
                      <SelectItem value="video_call">화상 상담</SelectItem>
                      <SelectItem value="parent_meeting">학부모 면담</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      상담 날짜 <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !form.watch('consultationDate') && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch('consultationDate') ? (
                            formatDate(form.watch('consultationDate')!, 'yyyy년 M월 d일', {
                              locale: ko,
                            })
                          ) : (
                            <span>날짜 선택</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch('consultationDate')}
                          onSelect={(date) => date && form.setValue('consultationDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.consultationDate && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.consultationDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consultationTime">
                      상담 시간 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="consultationTime"
                      type="time"
                      {...form.register('consultationTime')}
                    />
                    {form.formState.errors.consultationTime && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.consultationTime.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">상담 시간 (분)</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    placeholder="예: 30"
                    {...form.register('durationMinutes', { valueAsNumber: true })}
                  />
                  {form.formState.errors.durationMinutes && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.durationMinutes.message}
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <Label htmlFor="summary">상담 요약</Label>
                  <Textarea
                    id="summary"
                    placeholder="상담 내용을 간략하게 요약하세요..."
                    rows={4}
                    {...form.register('summary')}
                  />
                </div>

                {/* Outcome */}
                <div className="space-y-2">
                  <Label htmlFor="outcome">상담 결과</Label>
                  <Textarea
                    id="outcome"
                    placeholder="상담 결과 및 합의 사항을 입력하세요..."
                    rows={4}
                    {...form.register('outcome')}
                  />
                </div>

                {/* Follow-up Required */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followUpRequired"
                      checked={form.watch('followUpRequired')}
                      onCheckedChange={(checked) =>
                        form.setValue('followUpRequired', checked as boolean)
                      }
                    />
                    <Label htmlFor="followUpRequired" className="cursor-pointer">
                      후속 상담 필요
                    </Label>
                  </div>

                  {followUpRequired && (
                    <div className="space-y-2 pl-6">
                      <Label>다음 상담 예정일</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !form.watch('nextConsultationDate') &&
                                'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('nextConsultationDate') ? (
                              formatDate(
                                form.watch('nextConsultationDate')!,
                                'yyyy년 M월 d일',
                                { locale: ko }
                              )
                            ) : (
                              <span>날짜 선택</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={form.watch('nextConsultationDate')}
                            onSelect={(date) =>
                              form.setValue('nextConsultationDate', date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-6">
              <Link href={mode === 'edit' && consultation ? `/consultations/${consultation.id}` : '/consultations'}>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>처리 중...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {mode === 'create' ? '생성' : '수정'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
