'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getExamTemplates,
  setExamTemplateActive,
  deleteExam,
  createExam,
} from '@/app/actions/grades/exams'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { DatePicker } from '@ui/date-picker'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Plus, Edit, Trash2, Copy, FileText, Repeat, X, Pause, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface ExamTemplate {
  id: string
  name: string
  subject_id: string | null
  category_code: string | null
  exam_type: string | null
  total_questions: number | null
  passing_score: number | null
  recurring_schedule: string | null
  is_recurring: boolean
  is_template_active: boolean
  description: string | null
  class_id: string | null
  classes?: {
    name: string
  }[] | null
  subjects?: {
    name: string
    color: string
  } | null
  _count?: {
    generated: number
  }
}

interface ExamCategory {
  code: string
  label: string
}

type QuestionFilter = 'all' | 'lt20' | '20to40' | 'gt40' | 'unset'

function getTodayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

function formatDateToYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function ExamTemplatesClient() {
  // All Hooks must be called before any early returns
  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [scheduleFilter, setScheduleFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('all')
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [templateToGenerate, setTemplateToGenerate] = useState<ExamTemplate | null>(null)
  const [generateExamName, setGenerateExamName] = useState('')
  const [generateExamDate, setGenerateExamDate] = useState<Date | undefined>(new Date())

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  // useEffect must be called before any early returns
  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userLoading])

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>()
    templates.forEach((template) => {
      if (template.subject_id && template.subjects?.name) {
        map.set(template.subject_id, template.subjects.name)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  const availableClasses = useMemo(() => {
    const map = new Map<string, string>()
    templates.forEach((template) => {
      const className = template.classes?.[0]?.name
      if (template.class_id && className) {
        map.set(template.class_id, className)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const name = template.name?.toLowerCase() || ''
      const description = template.description?.toLowerCase() || ''
      const search = searchTerm.toLowerCase()
      const totalQuestions = template.total_questions

      if (searchTerm && !name.includes(search) && !description.includes(search)) {
        return false
      }

      if (subjectFilter !== 'all' && template.subject_id !== subjectFilter) {
        return false
      }

      if (scheduleFilter !== 'all' && template.recurring_schedule !== scheduleFilter) {
        return false
      }

      if (classFilter !== 'all' && template.class_id !== classFilter) {
        return false
      }

      if (questionFilter === 'lt20') {
        return totalQuestions !== null && totalQuestions < 20
      }
      if (questionFilter === '20to40') {
        return totalQuestions !== null && totalQuestions >= 20 && totalQuestions <= 40
      }
      if (questionFilter === 'gt40') {
        return totalQuestions !== null && totalQuestions > 40
      }
      if (questionFilter === 'unset') {
        return totalQuestions === null
      }

      return true
    })
  }, [templates, searchTerm, subjectFilter, scheduleFilter, classFilter, questionFilter])

  async function loadData() {
    try {
      setLoading(true)

      const [categoriesResult, templatesResult] = await Promise.all([
        supabase
          .from('ref_exam_categories')
          .select('code, label')
          .eq('active', true)
          .order('sort_order'),
        getExamTemplates(),
      ])

      if (categoriesResult.error) throw categoriesResult.error
      if (!templatesResult.success) throw new Error(templatesResult.error || '템플릿 조회 실패')

      setCategories(categoriesResult.data || [])
      setTemplates((templatesResult.data || []) as unknown as ExamTemplate[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: '데이터 로드 오류',
        description: error instanceof Error ? error.message : '템플릿을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveMutation = useMutation({
    mutationFn: async (template: ExamTemplate) => {
      const nextActive = !template.is_template_active
      const previousTemplates = templates
      // 낙관적 UI
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === template.id ? { ...item, is_template_active: nextActive } : item
        )
      )
      try {
        const result = await setExamTemplateActive(template.id, nextActive)
        if (!result.success) throw new Error(result.error || '상태 변경 실패')
        return { template, nextActive }
      } catch (error) {
        setTemplates(previousTemplates)
        throw error
      }
    },
    onSuccess: ({ template, nextActive }) => {
      toast({
        title: nextActive ? '템플릿 활성화' : '템플릿 일시중지',
        description: nextActive
          ? `"${template.name}" 템플릿의 자동 생성이 다시 활성화되었습니다.`
          : `"${template.name}" 템플릿의 자동 생성이 일시중지되었습니다.`,
      })
    },
    onError: () => {
      toast({
        title: '상태 변경 오류',
        description: '템플릿 상태를 변경하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    },
  })
  const togglingTemplateId = toggleActiveMutation.isPending
    ? toggleActiveMutation.variables?.id
    : null

  function handleToggleTemplateActive(template: ExamTemplate) {
    toggleActiveMutation.mutate(template)
  }

  function handleDelete(id: string, name: string) {
    setTemplateToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!templateToDelete) return

    setIsDeleting(true)
    const previousTemplates = templates
    setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete.id))

    try {
      const result = await deleteExam(templateToDelete.id)

      if (!result.success) throw new Error(result.error || '삭제 실패')

      toast({
        title: '삭제 완료',
        description: `${templateToDelete.name} 템플릿이 삭제되었습니다.`,
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      setTemplates(previousTemplates)
      toast({
        title: '삭제 오류',
        description: '템플릿을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  function openGenerateDialog(template: ExamTemplate) {
    const today = new Date()
    const [year, month, day] = getTodayYmd().split('-')
    setTemplateToGenerate(template)
    setGenerateExamDate(today)
    setGenerateExamName(`${template.name} (${year}.${month}.${day})`)
    setGenerateDialogOpen(true)
  }

  const generateExamMutation = useMutation({
    mutationFn: async (template: ExamTemplate) => {
      const result = await createExam({
        name: generateExamName.trim(),
        subject_id: template.subject_id,
        category_code: template.category_code,
        exam_type: template.exam_type,
        total_questions: template.total_questions,
        passing_score: template.passing_score,
        class_id: template.class_id,
        description: template.description,
        exam_date: formatDateToYmd(generateExamDate!),
        is_recurring: false,
      })
      if (!result.success) {
        throw new Error(result.error || '시험을 생성하는 중 오류가 발생했습니다.')
      }
      return result.data
    },
    onSuccess: (data) => {
      toast({
        title: '시험 생성 완료',
        description: `"${generateExamName.trim()}" 시험이 생성되었습니다.`,
      })
      setGenerateDialogOpen(false)
      setTemplateToGenerate(null)
      // Redirect to the created exam detail page for student assignment
      if (data?.examId) {
        router.push(`/grades/exams/${data.examId}`)
      } else {
        router.push('/grades')
      }
    },
    onError: (error: Error) => {
      toast({ title: '생성 오류', description: error.message, variant: 'destructive' })
    },
  })
  const isGeneratingTemplateId = generateExamMutation.isPending
    ? generateExamMutation.variables?.id
    : null

  function handleConfirmGenerateExam() {
    if (!currentUser || !templateToGenerate) return
    if (!generateExamDate) {
      toast({ title: '입력 필요', description: '시험일을 선택해주세요.', variant: 'destructive' })
      return
    }
    if (!generateExamName.trim()) {
      toast({ title: '입력 필요', description: '시험명을 입력해주세요.', variant: 'destructive' })
      return
    }
    generateExamMutation.mutate(templateToGenerate)
  }

  function getCategoryLabel(code: string | null) {
    if (!code) return '-'
    const category = categories.find((c) => c.code === code)
    return category?.label || code
  }

  function getRecurrenceLabel(schedule: string | null) {
    if (!schedule) return '없음'
    const scheduleMap: Record<string, string> = {
      daily: '매일',
      weekly_mon_wed_fri: '매주 월수금',
      weekly_tue_thu: '매주 화목',
      weekly: '매주 (같은 요일)',
      biweekly: '격주',
      monthly: '매월',
    }
    return scheduleMap[schedule] || schedule
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.gradesManagement;
  const hasActiveFilters =
    subjectFilter !== 'all' ||
    scheduleFilter !== 'all' ||
    classFilter !== 'all' ||
    questionFilter !== 'all'
  const weeklyTemplateCount = templates.filter((template) => {
    const schedule = template.recurring_schedule || ''
    return schedule.startsWith('weekly') || schedule === 'biweekly'
  }).length
  const pausedTemplateCount = templates.filter((template) => !template.is_template_active).length

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="시험 템플릿" description="반복되는 시험을 템플릿으로 관리하고 자동으로 생성하여 업무 효율을 높일 수 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 템플릿" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading || userLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">시험 템플릿 관리</h1>
            <p className="text-muted-foreground">반복되는 시험을 템플릿으로 관리하고 자동 생성하세요</p>
          </div>
          <Button onClick={() => router.push('/grades/exam-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            템플릿 등록
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="템플릿명, 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="secondary" className="h-10 px-4 flex items-center">
              {filteredTemplates.length}개 템플릿
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="subject-filter" className="text-xs text-muted-foreground">과목</Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger id="subject-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 과목</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="schedule-filter" className="text-xs text-muted-foreground">반복 주기</Label>
              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger id="schedule-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 주기</SelectItem>
                  <SelectItem value="daily">매일</SelectItem>
                  <SelectItem value="weekly_mon_wed_fri">매주 월수금</SelectItem>
                  <SelectItem value="weekly_tue_thu">매주 화목</SelectItem>
                  <SelectItem value="weekly">매주</SelectItem>
                  <SelectItem value="biweekly">격주</SelectItem>
                  <SelectItem value="monthly">매월</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="class-filter" className="text-xs text-muted-foreground">수업</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger id="class-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 수업</SelectItem>
                  {availableClasses.map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {klass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="question-filter" className="text-xs text-muted-foreground">문항 수</Label>
              <Select value={questionFilter} onValueChange={(value) => setQuestionFilter(value as QuestionFilter)}>
                <SelectTrigger id="question-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 문항</SelectItem>
                  <SelectItem value="lt20">20문항 미만</SelectItem>
                  <SelectItem value="20to40">20~40문항</SelectItem>
                  <SelectItem value="gt40">40문항 초과</SelectItem>
                  <SelectItem value="unset">미설정</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubjectFilter('all')
                  setScheduleFilter('all')
                  setClassFilter('all')
                  setQuestionFilter('all')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                필터 초기화
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 템플릿 수</CardDescription>
              <CardTitle className="text-3xl">{templates.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>주간 템플릿</CardDescription>
              <CardTitle className="text-3xl">
                {weeklyTemplateCount}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>월간 템플릿</CardDescription>
              <CardTitle className="text-3xl">
                {templates.filter((t) => t.recurring_schedule === 'monthly').length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>일시중지 템플릿</CardDescription>
              <CardTitle className="text-3xl">
                {pausedTemplateCount}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>템플릿 목록</CardTitle>
            <CardDescription>
              등록된 시험 템플릿을 확인하고, 새로운 시험을 생성할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>등록된 템플릿이 없습니다.</p>
                {(searchTerm || hasActiveFilters) && <p className="text-sm mt-2">검색/필터 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>템플릿명</TableHead>
                      <TableHead>과목</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>반복 주기</TableHead>
                      <TableHead className="text-center">문항 수</TableHead>
                      <TableHead>연결된 수업</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-info" />
                            <span className="font-medium">{template.name}</span>
                            {!template.is_template_active && (
                              <Badge variant="secondary">일시중지</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.subjects ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: template.subjects.color }}
                              />
                              <span className="text-sm">{template.subjects.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCategoryLabel(template.category_code)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getRecurrenceLabel(template.recurring_schedule)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {template.total_questions || '-'}
                        </TableCell>
                        <TableCell>
                          {template.classes?.[0]?.name || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {template.description ? (
                            <div className="text-sm text-muted-foreground truncate">
                              {template.description}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openGenerateDialog(template)}
                              disabled={isGeneratingTemplateId === template.id}
                              className="bg-success hover:bg-success/90"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              {isGeneratingTemplateId === template.id ? '생성 중...' : '시험 생성'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleTemplateActive(template)}
                              disabled={togglingTemplateId === template.id}
                            >
                              {template.is_template_active ? (
                                <>
                                  <Pause className="h-4 w-4 mr-1" />
                                  자동 중지
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  자동 재개
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/grades/exam-templates/${template.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template.id, template.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={
          templateToDelete
            ? `"${templateToDelete.name}" 템플릿이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Generate Exam Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿으로 시험 생성</DialogTitle>
            <DialogDescription>
              시험명과 시험일을 확인한 뒤 생성하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="generate-exam-name">시험명</Label>
              <Input
                id="generate-exam-name"
                value={generateExamName}
                onChange={(e) => setGenerateExamName(e.target.value)}
                placeholder="시험명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generate-exam-date">시험일</Label>
              <DatePicker
                id="generate-exam-date"
                value={generateExamDate}
                onChange={setGenerateExamDate}
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleConfirmGenerateExam}
              disabled={!templateToGenerate || isGeneratingTemplateId === templateToGenerate?.id}
            >
              {templateToGenerate && isGeneratingTemplateId === templateToGenerate.id ? '생성 중...' : '시험 생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
