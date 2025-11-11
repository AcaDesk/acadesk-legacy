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
import { Switch } from '@ui/switch'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog'
import { Loader2, Settings, Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createExam, updateExam, getExamCategories, getClassesForExam } from '@/app/actions/exams'
import { addExamCategory, deleteExamCategory } from '@/app/actions/tenant'
import { getSubjects } from '@/app/actions/subjects'
import { ClassSelector } from '@/components/features/common/class-selector'

// ============================================================================
// Types & Schemas
// ============================================================================

const examFormSchema = z.object({
  name: z.string().min(1, '시험명은 필수입니다'),
  subject_id: z.string().optional(),
  category_code: z.string().optional(),
  exam_type: z.string().optional(),
  exam_date: z.string().optional(),
  class_id: z.string().optional(),
  total_questions: z.string().optional(),
  passing_score: z.string().optional(),
  description: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurring_schedule: z.string().optional(),
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
  active: boolean
}

interface Subject {
  id: string
  name: string
  code: string | null
  color: string
  active: boolean
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
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryCode, setNewCategoryCode] = useState('')
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Form setup
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: defaultValues || {
      name: '',
      subject_id: undefined,
      category_code: undefined,
      exam_type: undefined,
      exam_date: '',
      class_id: undefined,
      total_questions: '',
      passing_score: '',
      description: '',
      is_recurring: false,
      recurring_schedule: undefined,
    },
  })

  // Load categories, classes, and subjects
  useEffect(() => {
    async function loadOptions() {
      const [categoriesResult, classesResult, subjectsResult] = await Promise.all([
        getExamCategories(),
        getClassesForExam(),
        getSubjects(),
      ])

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

      if (classesResult.success && classesResult.data) {
        // Map to include active field (default to true if not provided)
        setClasses(classesResult.data.map(cls => ({
          ...cls,
          active: ('active' in cls ? cls.active : true) as boolean
        })))
      }

      if (subjectsResult.success && subjectsResult.data) {
        setSubjects(subjectsResult.data)
      }
    }

    loadOptions()
  }, [])

  // Reload categories
  async function reloadCategories() {
    const result = await getExamCategories()
    if (result.success && result.data) {
      setCategories(result.data)
    }
  }

  // Add new category
  async function handleAddCategory() {
    if (!newCategoryCode || !newCategoryLabel) {
      toast({
        title: '입력 오류',
        description: '코드와 이름을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setCategoryLoading(true)
    try {
      const result = await addExamCategory(newCategoryCode, newCategoryLabel)

      if (!result.success) {
        throw new Error(result.error || '카테고리 추가 실패')
      }

      toast({
        title: '카테고리 추가 완료',
        description: `${newCategoryLabel} 카테고리가 추가되었습니다.`,
      })

      setNewCategoryCode('')
      setNewCategoryLabel('')
      await reloadCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: '카테고리 추가 실패',
        description: error instanceof Error ? error.message : '카테고리 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setCategoryLoading(false)
    }
  }

  // Delete category
  async function handleDeleteCategory(code: string) {
    setCategoryLoading(true)
    try {
      const result = await deleteExamCategory(code)

      if (!result.success) {
        throw new Error(result.error || '카테고리 삭제 실패')
      }

      toast({
        title: '카테고리 삭제 완료',
        description: '카테고리가 삭제되었습니다.',
      })

      await reloadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: '카테고리 삭제 실패',
        description: error instanceof Error ? error.message : '카테고리 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setCategoryLoading(false)
    }
  }

  async function onSubmit(values: ExamFormValues) {
    setIsLoading(true)

    try {
      // Convert string values to proper types
      const examData = {
        name: values.name,
        subject_id: values.subject_id && values.subject_id !== 'none' && values.subject_id.trim() !== '' ? values.subject_id : null,
        category_code: values.category_code && values.category_code !== 'none' && values.category_code.trim() !== '' ? values.category_code : null,
        exam_type: values.exam_type && values.exam_type !== 'none' && values.exam_type.trim() !== '' ? values.exam_type : null,
        exam_date: values.exam_date || null,
        class_id: values.class_id && values.class_id !== 'none' && values.class_id.trim() !== '' ? values.class_id : null,
        total_questions: values.total_questions ? parseInt(values.total_questions) : null,
        passing_score: values.passing_score ? parseFloat(values.passing_score) : null,
        description: values.description || null,
        is_recurring: values.is_recurring || false,
        recurring_schedule: values.is_recurring && values.recurring_schedule && values.recurring_schedule !== 'none' && values.recurring_schedule.trim() !== ''
          ? values.recurring_schedule
          : null,
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

            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>과목</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="과목 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span>{subject.name}</span>
                            {subject.code && (
                              <span className="text-muted-foreground text-xs">({subject.code})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    시험이 속한 과목을 선택하세요 (Voca, Reading, Speaking 등)
                  </FormDescription>
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
                    <div className="flex items-center justify-between">
                      <FormLabel>시험 분류</FormLabel>
                      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            관리
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>시험 분류 관리</DialogTitle>
                            <DialogDescription>
                              시험 분류를 추가하거나 삭제할 수 있습니다.
                            </DialogDescription>
                          </DialogHeader>

                          {/* Add new category */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">새 분류 추가</h4>
                              <div className="grid gap-2">
                                <Input
                                  placeholder="코드 (예: custom1)"
                                  value={newCategoryCode}
                                  onChange={(e) => setNewCategoryCode(e.target.value)}
                                  disabled={categoryLoading}
                                />
                                <Input
                                  placeholder="이름 (예: 커스텀 분류)"
                                  value={newCategoryLabel}
                                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                                  disabled={categoryLoading}
                                />
                                <Button
                                  type="button"
                                  onClick={handleAddCategory}
                                  disabled={categoryLoading || !newCategoryCode || !newCategoryLabel}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  추가
                                </Button>
                              </div>
                            </div>

                            {/* Existing categories */}
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">기존 분류</h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {categories.map((category) => (
                                  <div
                                    key={category.code}
                                    className="flex items-center justify-between p-2 border rounded"
                                  >
                                    <div>
                                      <p className="font-medium">{category.label}</p>
                                      <p className="text-xs text-muted-foreground">{category.code}</p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteCategory(category.code)}
                                      disabled={categoryLoading}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setCategoryDialogOpen(false)}
                            >
                              닫기
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">미선택</SelectItem>
                        <SelectItem value="vocabulary">단어시험</SelectItem>
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
                  // Handle empty strings safely
                  const dateValue = field.value && field.value.trim() !== ''
                    ? parse(field.value, 'yyyy-MM-dd', new Date())
                    : undefined

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
                    <FormControl>
                      <ClassSelector
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="수업 선택"
                        classes={classes}
                      />
                    </FormControl>
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

        {/* Recurring Schedule (For Vocabulary Tests) */}
        <Card>
          <CardHeader>
            <CardTitle>반복 설정</CardTitle>
            <CardDescription>정기적으로 반복되는 시험인 경우 설정하세요 (예: 단어시험)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">반복 시험</FormLabel>
                    <FormDescription>
                      정기적으로 반복되는 시험으로 설정합니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('is_recurring') && (
              <FormField
                control={form.control}
                name="recurring_schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>반복 주기</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="주기 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        <SelectItem value="daily">매일</SelectItem>
                        <SelectItem value="weekly_mon_wed_fri">매주 월수금</SelectItem>
                        <SelectItem value="weekly_tue_thu">매주 화목</SelectItem>
                        <SelectItem value="weekly">매주 (같은 요일)</SelectItem>
                        <SelectItem value="biweekly">격주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      반복 주기를 선택하세요. 단어시험은 보통 매일 또는 월수금으로 설정합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
