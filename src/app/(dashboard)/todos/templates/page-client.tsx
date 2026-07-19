'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Separator } from '@ui/separator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Clock,
  Search,
  X,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Info,
  BookOpen,
  Sparkles,
  Power,
  PowerOff
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DAYS_OF_WEEK } from '@/lib/constants'
import { useMutation } from '@tanstack/react-query'
import { getStudents } from '@/app/actions/students'
import { createTodosForStudents } from '@/app/actions/todos'
import { useTodoTemplatesQuery } from '@/hooks/queries/use-todo-templates-query'
import {
  useDeleteTodoTemplateMutation,
  useToggleTodoTemplateActiveMutation,
} from '@/hooks/mutations/use-todo-mutations'
import { getErrorMessage } from '@/lib/error-handlers'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface TodoTemplate {
  id: string
  title: string
  description: string | null
  subject: string | null
  day_of_week: number | null
  estimated_duration_minutes: number | null
  priority: string | null
  active: boolean
}

const PRIORITY_CONFIG = {
  high: { label: '높음', icon: AlertCircle, color: 'text-red-600', variant: 'destructive' as const },
  normal: { label: '보통', icon: CheckCircle2, color: 'text-info', variant: 'secondary' as const },
  low: { label: '낮음', icon: Info, color: 'text-gray-600', variant: 'outline' as const },
}

// 템플릿 다이얼로그 통합 상태 (discriminated union)
type ActiveDialog =
  | { type: 'detail'; template: TodoTemplate }
  | { type: 'delete'; template: { id: string; title: string } }
  | { type: 'generate'; template: TodoTemplate }

export default function TodoTemplatesPage() {
  // All Hooks must be called before any early returns
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'normal' | 'low'>('all')
  const [dayFilter, setDayFilter] = useState<'all' | string>('all')

  const closeDialog = () => setActiveDialog(null)
  // 상세 모달이 참조하는 템플릿 (닫힘 애니메이션 중에도 유지)
  const selectedTemplate = activeDialog?.type === 'detail' ? activeDialog.template : null
  const templateToDelete = activeDialog?.type === 'delete' ? activeDialog.template : null
  const templateToGenerate = activeDialog?.type === 'generate' ? activeDialog.template : null

  const { toast } = useToast()
  const router = useRouter()
  const { user: currentUser } = useCurrentUser()

  const templatesQuery = useTodoTemplatesQuery(!!currentUser?.tenantId)
  const loading = templatesQuery.isPending

  // Server Action에서 반환하는 데이터를 UI 타입으로 매핑
  const templates: TodoTemplate[] = useMemo(
    () =>
      (templatesQuery.data ?? []).map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        subject: template.subject,
        day_of_week: template.day_of_week,
        estimated_duration_minutes: template.estimated_duration_minutes,
        priority: template.priority,
        active: template.active,
      })),
    [templatesQuery.data]
  )

  // 로드 실패 알림
  useEffect(() => {
    if (templatesQuery.error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(templatesQuery.error),
        variant: 'destructive',
      })
    }
  }, [templatesQuery.error, toast])

  const deleteMutation = useDeleteTodoTemplateMutation({
    onSettled: () => {
      closeDialog()
    },
  })
  const toggleActiveMutation = useToggleTodoTemplateActiveMutation()

  const filteredTemplates = useMemo(() => {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter((template) => {
        const title = template.title?.toLowerCase() || ''
        const description = template.description?.toLowerCase() || ''
        const subject = template.subject?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return title.includes(search) || description.includes(search) || subject.includes(search)
      })
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) =>
        statusFilter === 'active' ? t.active : !t.active
      )
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    if (dayFilter !== 'all') {
      filtered = filtered.filter((t) =>
        t.day_of_week !== null && t.day_of_week.toString() === dayFilter
      )
    }

    return filtered
  }, [templates, searchTerm, statusFilter, priorityFilter, dayFilter])

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDayFilter('all')
  }

  function hasActiveFilters() {
    return searchTerm !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || dayFilter !== 'all'
  }

  function handleDeleteClick(id: string, title: string) {
    setActiveDialog({ type: 'delete', template: { id, title } })
  }

  function handleConfirmDelete() {
    if (!templateToDelete) return
    deleteMutation.mutate(templateToDelete)
  }

  function handleToggleActive(template: TodoTemplate) {
    toggleActiveMutation.mutate({
      id: template.id,
      title: template.title,
      active: template.active,
    })
  }

  function handleGenerateClick(template: TodoTemplate) {
    setActiveDialog({ type: 'generate', template })
  }

  const generateMutation = useMutation({
    mutationFn: async (template: TodoTemplate) => {
      // Get all active students
      const studentsResult = await getStudents()

      if (!studentsResult.success || !studentsResult.data) {
        throw new Error(studentsResult.error || '학생 목록을 불러올 수 없습니다')
      }

      if (studentsResult.data.length === 0) {
        throw new Error('등록된 학생이 없습니다.')
      }

      // Calculate due date based on day_of_week
      const today = new Date()
      const targetDayOfWeek = template.day_of_week !== null ? template.day_of_week : today.getDay()
      const daysUntilTarget = (targetDayOfWeek - today.getDay() + 7) % 7
      const dueDate = new Date(today)
      dueDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))

      // Create todos using Server Action
      const createResult = await createTodosForStudents({
        studentIds: studentsResult.data.map(s => s.id),
        title: template.title,
        description: template.description || undefined,
        subject: template.subject || undefined,
        dueDate: dueDate.toISOString(),
        priority: (template.priority || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
      })

      if (!createResult.success) {
        throw new Error(createResult.error || 'TODO 생성 실패')
      }

      return { studentCount: studentsResult.data.length, title: template.title }
    },
    onSuccess: ({ studentCount, title }) => {
      toast({
        title: '과제 생성 완료',
        description: `${studentCount}명의 학생에게 "${title}" 과제가 배정되었습니다.`,
      })
      router.push('/todos')
    },
    onError: (error: Error) => {
      toast({
        title: '생성 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
    onSettled: () => {
      closeDialog()
    },
  })

  function handleConfirmGenerate() {
    if (!currentUser?.tenantId || !templateToGenerate) return
    generateMutation.mutate(templateToGenerate)
  }

  function handleViewTemplate(template: TodoTemplate) {
    setActiveDialog({ type: 'detail', template })
  }

  // Remove markdown syntax for clean preview
  function stripMarkdown(text: string): string {
    return text
      // Remove headers
      .replace(/#{1,6}\s+/g, '')
      // Remove bold
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      // Remove italic
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove strikethrough
      .replace(/~~(.+?)~~/g, '$1')
      // Remove links
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      // Remove images
      .replace(/!\[(.+?)\]\(.+?\)/g, '$1')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Normalize whitespace
      .replace(/\n\n+/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
  }


  if (loading) {
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">과제 템플릿</h1>
            <p className="text-muted-foreground mt-1">
              반복되는 과제를 템플릿으로 관리하고 자동으로 배정하세요
            </p>
          </div>
          <Button onClick={() => router.push('/todos/templates/new')} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            새 템플릿
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                총 템플릿
              </CardDescription>
              <CardTitle className="text-3xl">{templates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Power className="h-4 w-4 text-green-600" />
                활성 템플릿
              </CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {templates.filter((t) => t.active).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                높은 우선순위
              </CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {templates.filter((t) => t.priority === 'high').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                주간 과제
              </CardDescription>
              <CardTitle className="text-3xl">
                {templates.filter((t) => t.day_of_week !== null).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="템플릿명, 과목, 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">필터:</span>
                </div>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="inactive">비활성</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 우선순위</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="normal">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dayFilter} onValueChange={setDayFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 요일</SelectItem>
                    {Object.entries(DAYS_OF_WEEK).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}요일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters() && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    초기화
                  </Button>
                )}

                <div className="ml-auto">
                  <Badge variant="secondary" className="h-9 px-3">
                    {filteredTemplates.length}개 표시
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-6">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {searchTerm || hasActiveFilters() ? '검색 결과가 없습니다' : '등록된 템플릿이 없습니다'}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {searchTerm || hasActiveFilters()
                      ? '다른 검색어나 필터를 시도해보세요'
                      : '새로운 과제 템플릿을 등록하여 반복되는 과제를 자동화하세요'
                    }
                  </p>
                </div>
                {!searchTerm && !hasActiveFilters() && (
                  <Button onClick={() => router.push('/todos/templates/new')} size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    첫 템플릿 만들기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const priorityConfig = PRIORITY_CONFIG[template.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal
              const PriorityIcon = priorityConfig.icon

              return (
                <Card
                  key={template.id}
                  className={`group hover:shadow-lg transition-all cursor-pointer ${
                    !template.active ? 'opacity-60' : ''
                  }`}
                  onClick={() => handleViewTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {template.title}
                        </CardTitle>
                        {template.description && (
                          <CardDescription className="mt-2 line-clamp-2">
                            {stripMarkdown(template.description)}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleGenerateClick(template)} disabled={!template.active}>
                            <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                            과제 일괄 생성
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/todos/templates/${template.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                            {template.active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                비활성화
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                활성화
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(template.id, template.title)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Metadata */}
                    <div className="space-y-2">
                      {template.subject && (
                        <div className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Badge variant="outline">{template.subject}</Badge>
                        </div>
                      )}

                      {template.day_of_week !== null && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>매주 {DAYS_OF_WEEK[template.day_of_week]}요일 마감</span>
                        </div>
                      )}

                      {template.estimated_duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>약 {template.estimated_duration_minutes}분 소요</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityConfig.variant}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant={template.active ? 'default' : 'secondary'}>
                          {template.active ? '활성' : '비활성'}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateClick(template)
                        }}
                        disabled={!template.active}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        생성
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Template Detail Dialog */}
        <Dialog open={activeDialog?.type === 'detail'} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-2xl">
            {selectedTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedTemplate.title}</DialogTitle>
                  {selectedTemplate.description && (
                    <div className="prose prose-sm max-w-none dark:prose-invert pt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {selectedTemplate.description}
                      </ReactMarkdown>
                    </div>
                  )}
                  {!selectedTemplate.description && (
                    <DialogDescription>설명이 없습니다</DialogDescription>
                  )}
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status and Priority */}
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedTemplate.active ? 'default' : 'secondary'}>
                      {selectedTemplate.active ? '활성' : '비활성'}
                    </Badge>
                    <Badge
                      variant={
                        PRIORITY_CONFIG[selectedTemplate.priority as keyof typeof PRIORITY_CONFIG]?.variant || 'secondary'
                      }
                    >
                      {PRIORITY_CONFIG[selectedTemplate.priority as keyof typeof PRIORITY_CONFIG]?.label || '보통'}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Details Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedTemplate.subject && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          과목
                        </div>
                        <p className="text-sm font-medium">{selectedTemplate.subject}</p>
                      </div>
                    )}

                    {selectedTemplate.day_of_week !== null && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          마감 요일
                        </div>
                        <p className="text-sm font-medium">
                          매주 {DAYS_OF_WEEK[selectedTemplate.day_of_week]}요일
                        </p>
                      </div>
                    )}

                    {selectedTemplate.estimated_duration_minutes && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          예상 소요 시간
                        </div>
                        <p className="text-sm font-medium">
                          약 {selectedTemplate.estimated_duration_minutes}분
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        우선순위
                      </div>
                      <p className="text-sm font-medium">
                        {PRIORITY_CONFIG[selectedTemplate.priority as keyof typeof PRIORITY_CONFIG]?.label || '보통'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="default"
                      onClick={() => handleGenerateClick(selectedTemplate)}
                      disabled={!selectedTemplate.active}
                      className="flex-1 gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      과제 일괄 생성
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        closeDialog()
                        router.push(`/todos/templates/${selectedTemplate.id}/edit`)
                      }}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        closeDialog()
                        handleToggleActive(selectedTemplate)
                      }}
                      className="gap-2"
                    >
                      {selectedTemplate.active ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          비활성화
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          활성화
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteClick(selectedTemplate.id, selectedTemplate.title)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={activeDialog?.type === 'delete'}
          onOpenChange={(open) => !open && closeDialog()}
          title="템플릿 삭제"
          description={templateToDelete ? `"${templateToDelete.title}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : ''}
          confirmText="삭제"
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
        />

        {/* Generate Todos Confirmation Dialog */}
        <ConfirmationDialog
          open={activeDialog?.type === 'generate'}
          onOpenChange={(open) => !open && closeDialog()}
          title="과제 일괄 생성"
          description={templateToGenerate ? `전체 학생에게 "${templateToGenerate.title}" 과제를 배정하시겠습니까?` : ''}
          confirmText="생성"
          variant="default"
          isLoading={generateMutation.isPending}
          onConfirm={handleConfirmGenerate}
        />
      </div>
    </PageWrapper>
  )
}
