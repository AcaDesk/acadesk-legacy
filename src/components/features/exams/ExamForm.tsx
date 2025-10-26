'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parse } from 'date-fns'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { DatePicker } from '@ui/date-picker'
import { Textarea } from '@ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createExam, updateExam, getExamCategories, getClassesForExam } from '@/app/actions/exams'

// ============================================================================
// Types & Schemas
// ============================================================================

const examFormSchema = z.object({
  name: z.string().min(1, '시험명은 필수입니다'),
  category_code: z.string().optional(),
  exam_type: z.string().optional(),
  exam_date: z.string().optional(),
  class_id: z.string().optional(),
  total_questions: z.string().optional(),
  passing_score: z.string().optional(),
  description: z.string().optional(),
})

type ExamFormValues = z.infer<typeof examFormSchema>

interface ExamFormProps {
  mode: 'create' | 'edit'
  examId?: string
  defaultValues?: Partial<ExamFormValues>
  onSuccess?: () => void
}

interface ExamCategory {
  code: string
  label: string
}

interface ClassOption {
  id: string
  name: string
  subject: string | null
}

// ============================================================================
// Component
// ============================================================================

export function ExamForm({ mode, examId, defaultValues, onSuccess }: ExamFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])

  // Form setup
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: defaultValues || {
      name: '',
      category_code: '',
      exam_type: '',
      exam_date: '',
      class_id: '',
      total_questions: '',
      passing_score: '',
      description: '',
    },
  })

  // Load categories and classes
  useEffect(() => {
    async function loadOptions() {
      const [categoriesResult, classesResult] = await Promise.all([
        getExamCategories(),
        getClassesForExam(),
      ])

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

      if (classesResult.success && classesResult.data) {
        setClasses(classesResult.data)
      }
    }

    loadOptions()
  }, [])

  async function onSubmit(values: ExamFormValues) {
    setIsLoading(true)

    try {
      // Convert string values to proper types
      const examData = {
        name: values.name,
        category_code: values.category_code && values.category_code !== 'none' ? values.category_code : null,
        exam_type: values.exam_type && values.exam_type !== 'none' ? values.exam_type : null,
        exam_date: values.exam_date || null,
        class_id: values.class_id && values.class_id !== 'none' ? values.class_id : null,
        total_questions: values.total_questions ? parseInt(values.total_questions) : null,
        passing_score: values.passing_score ? parseFloat(values.passing_score) : null,
        description: values.description || null,
      }

      let result

      if (mode === 'create') {
        result = await createExam(examData)
      } else if (mode === 'edit' && examId) {
        result = await updateExam(examId, examData)
      } else {
        throw new Error('Invalid mode or missing examId')
      }

      if (!result.success) {
        throw new Error(result.error || '시험 저장에 실패했습니다')
      }

      toast({
        title: mode === 'create' ? '시험 등록 완료' : '시험 수정 완료',
        description: mode === 'create' ? '새 시험이 등록되었습니다. 학생을 배정하세요.' : '시험 정보가 수정되었습니다.',
      })

      if (onSuccess) {
        onSuccess()
      } else if (mode === 'create' && result.data?.examId) {
        // 시험 생성 시 상세 페이지로 이동
        router.push(`/grades/exams/${result.data.examId}`)
      } else {
        router.push('/grades/exams')
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving exam:', error)
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '시험 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>시험의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시험명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 2024년 1학기 중간고사" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시험 분류</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="분류 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">미분류</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.code} value={category.code}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exam_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시험 유형</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">미선택</SelectItem>
                        <SelectItem value="midterm">중간고사</SelectItem>
                        <SelectItem value="final">기말고사</SelectItem>
                        <SelectItem value="quiz">퀴즈</SelectItem>
                        <SelectItem value="mock">모의고사</SelectItem>
                        <SelectItem value="assignment">과제</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="exam_date"
                render={({ field }) => {
                  // Convert string (YYYY-MM-DD) to Date for DatePicker
                  const dateValue = field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : undefined

                  return (
                    <FormItem>
                      <FormLabel>시험일</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={dateValue}
                          onChange={(date) => {
                            // Convert Date to string (YYYY-MM-DD) for form
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연결된 수업</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="수업 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">선택 안 함</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.subject && `(${cls.subject})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      수업과 연결하면 해당 수업의 학생들에게 시험을 배정할 수 있습니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Exam Details */}
        <Card>
          <CardHeader>
            <CardTitle>시험 상세</CardTitle>
            <CardDescription>시험의 상세 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="total_questions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>총 문항 수</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="예: 20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passing_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>합격 점수 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="예: 60"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>합격 기준 점수를 백분율로 입력하세요</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시험 설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="시험에 대한 설명이나 특이사항을 입력하세요"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? '시험 등록' : '변경사항 저장'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
