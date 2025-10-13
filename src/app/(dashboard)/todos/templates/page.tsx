'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  PowerOff,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DAYS_OF_WEEK } from '@/lib/constants'
import { StudentRepository } from '@/services/data/student.repository'
import { TodoRepository } from '@/services/data/todo.repository'
import { getErrorMessage } from '@/lib/error-handlers'

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
  normal: { label: '보통', icon: CheckCircle2, color: 'text-blue-600', variant: 'secondary' as const },
  low: { label: '낮음', icon: Info, color: 'text-gray-600', variant: 'outline' as const },
}

export default function TodoTemplatesPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 템플릿" description="반복되는 과제를 템플릿으로 관리하고 자동으로 배정하여 효율적으로 학습 관리를 할 수 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 템플릿" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  const [templates, setTemplates] = useState<TodoTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TodoTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'normal' | 'low'>('all')
  const [dayFilter, setDayFilter] = useState<'all' | string>('all')

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const studentRepo = new StudentRepository(supabase)
  const todoRepo = new TodoRepository(supabase)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, templates, statusFilter, priorityFilter, dayFilter])

  async function loadTemplates() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('todo_templates')
        .select('*')
        .order('active', { ascending: false })
        .order('priority', { ascending: false })
        .order('title')

      if (error) throw error
      setTemplates(data)
      setFilteredTemplates(data)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterTemplates() {
    let filtered = templates

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((template) => {
        const title = template.title?.toLowerCase() || ''
        const description = template.description?.toLowerCase() || ''
        const subject = template.subject?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return title.includes(search) || description.includes(search) || subject.includes(search)
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) =>
        statusFilter === 'active' ? t.active : !t.active
      )
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    // Day filter
    if (dayFilter !== 'all') {
      filtered = filtered.filter((t) =>
        t.day_of_week !== null && t.day_of_week.toString() === dayFilter
      )
    }

    setFilteredTemplates(filtered)
  }

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDayFilter('all')
  }

  function hasActiveFilters() {
    return searchTerm !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || dayFilter !== 'all'
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 템플릿을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('todo_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: '삭제 완료',
        description: `${title} 템플릿이 삭제되었습니다.`,
      })

      loadTemplates()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleToggleActive(template: TodoTemplate) {
    try {
      const { error } = await supabase
        .from('todo_templates')
        .update({ active: !template.active })
        .eq('id', template.id)

      if (error) throw error

      toast({
        title: template.active ? '비활성화됨' : '활성화됨',
        description: `"${template.title}" 템플릿이 ${template.active ? '비활성화' : '활성화'}되었습니다.`,
      })

      loadTemplates()
    } catch (error) {
      toast({
        title: '변경 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleGenerateTodos(template: TodoTemplate) {
    if (!currentUser) return

    if (!confirm(`전체 학생에게 "${template.title}" 과제를 배정하시겠습니까?`)) {
      return
    }

    try {
      // Get all active students
      const students = await studentRepo.search('', { limit: 1000 })

      if (!students || students.length === 0) {
        toast({
          title: '학생 없음',
          description: '등록된 학생이 없습니다.',
          variant: 'destructive',
        })
        return
      }

      // Calculate due date based on day_of_week
      const today = new Date()
      const targetDayOfWeek = template.day_of_week !== null ? template.day_of_week : today.getDay()
      const daysUntilTarget = (targetDayOfWeek - today.getDay() + 7) % 7
      const dueDate = new Date(today)
      dueDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))

      const todosToCreate = students.map(student => ({
        tenant_id: currentUser.tenantId,
        student_id: student.id,
        title: template.title,
        description: template.description || undefined,
        subject: template.subject || undefined,
        due_date: dueDate.toISOString().split('T')[0],
        priority: template.priority || 'normal',
      }))

      await todoRepo.createBulk(todosToCreate)

      toast({
        title: '과제 생성 완료',
        description: `${students.length}명의 학생에게 "${template.title}" 과제가 배정되었습니다.`,
      })

      router.push('/todos')
    } catch (error) {
      toast({
        title: '생성 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  function handleViewTemplate(template: TodoTemplate) {
    setSelectedTemplate(template)
    setDetailDialogOpen(true)
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
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/todos')}
            className="hover:text-foreground transition-colors"
          >
            TODO 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">과제 템플릿</span>
        </nav>

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

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="inactive">비활성</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
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
                          <DropdownMenuItem onClick={() => handleGenerateTodos(template)} disabled={!template.active}>
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
                            onClick={() => handleDelete(template.id, template.title)}
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
                          handleGenerateTodos(template)
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
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
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
                      onClick={() => {
                        setDetailDialogOpen(false)
                        handleGenerateTodos(selectedTemplate)
                      }}
                      disabled={!selectedTemplate.active}
                      className="flex-1 gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      과제 일괄 생성
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailDialogOpen(false)
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
                        setDetailDialogOpen(false)
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
                      onClick={() => {
                        setDetailDialogOpen(false)
                        handleDelete(selectedTemplate.id, selectedTemplate.title)
                      }}
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
      </div>
    </PageWrapper>
  )
}
