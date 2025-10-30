'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Plus, Edit, Trash2, Copy, FileText, Repeat } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ConfirmationDialog } from '@ui/confirmation-dialog'
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

export function ExamTemplatesClient() {
  // All Hooks must be called before any early returns
  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ExamTemplate[]>([])
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  useEffect(() => {
    filterTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, templates])

  async function loadData() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      setLoading(true)

      // Load exam categories (reference table, no tenant_id)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('ref_exam_categories')
        .select('code, label')
        .eq('active', true)
        .order('sort_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData)

      // Load recurring exams as templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          subject_id,
          category_code,
          exam_type,
          total_questions,
          passing_score,
          recurring_schedule,
          is_recurring,
          description,
          class_id,
          classes (name),
          subjects (name, color)
        `)
        .eq('tenant_id', currentUser.tenantId)
        .eq('is_recurring', true)
        .is('deleted_at', null)
        .order('name')

      if (templatesError) throw templatesError
      setTemplates(templatesData as ExamTemplate[])
      setFilteredTemplates(templatesData as ExamTemplate[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: '데이터 로드 오류',
        description: '템플릿을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterTemplates() {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter((template) => {
        const name = template.name?.toLowerCase() || ''
        const description = template.description?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return name.includes(search) || description.includes(search)
      })
    }

    setFilteredTemplates(filtered)
  }

  function handleDelete(id: string, name: string) {
    setTemplateToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!templateToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('exams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateToDelete.id)

      if (error) throw error

      toast({
        title: '삭제 완료',
        description: `${templateToDelete.name} 템플릿이 삭제되었습니다.`,
      })

      loadData()
    } catch (error) {
      console.error('Error deleting template:', error)
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

  function calculateNextExamDate(schedule: string | null): Date {
    const now = new Date()
    const result = new Date(now)

    if (!schedule) return result

    switch (schedule) {
      case 'daily':
        // Today
        return result

      case 'weekly_mon_wed_fri': {
        // Find next Monday, Wednesday, or Friday
        const day = result.getDay() // 0 = Sunday, 1 = Monday, etc.
        if (day === 1 || day === 3 || day === 5) {
          // Already Mon/Wed/Fri, use today
          return result
        } else if (day === 0 || day === 6 || day === 2 || day === 4) {
          // Find next Mon/Wed/Fri
          const daysToAdd = day === 0 ? 1 : // Sunday -> Monday
                            day === 6 ? 2 : // Saturday -> Monday
                            day === 2 ? 1 : // Tuesday -> Wednesday
                            day === 4 ? 1 : 0 // Thursday -> Friday
          result.setDate(result.getDate() + daysToAdd)
        }
        return result
      }

      case 'weekly_tue_thu': {
        // Find next Tuesday or Thursday
        const day = result.getDay()
        if (day === 2 || day === 4) {
          // Already Tue/Thu, use today
          return result
        } else if (day === 0 || day === 1 || day === 3 || day === 5 || day === 6) {
          // Find next Tue/Thu
          const daysToAdd = day === 0 ? 2 : // Sunday -> Tuesday
                            day === 1 ? 1 : // Monday -> Tuesday
                            day === 3 ? 1 : // Wednesday -> Thursday
                            day === 5 ? 4 : // Friday -> Tuesday
                            day === 6 ? 3 : 0 // Saturday -> Tuesday
          result.setDate(result.getDate() + daysToAdd)
        }
        return result
      }

      case 'weekly':
        // Next week, same day
        result.setDate(result.getDate() + 7)
        return result

      case 'biweekly':
        // Two weeks later, same day
        result.setDate(result.getDate() + 14)
        return result

      case 'monthly':
        // Next month, same day
        result.setMonth(result.getMonth() + 1)
        return result

      default:
        return result
    }
  }

  async function handleGenerateExam(template: ExamTemplate) {
    if (!currentUser) return

    try {
      // Calculate next exam date based on recurring schedule
      const examDate = calculateNextExamDate(template.recurring_schedule)
      const examName = `${template.name} (${examDate.getFullYear()}.${String(examDate.getMonth() + 1).padStart(2, '0')}.${String(examDate.getDate()).padStart(2, '0')})`

      const newExam = {
        tenant_id: currentUser.tenantId,
        name: examName,
        subject_id: template.subject_id,
        category_code: template.category_code,
        exam_type: template.exam_type,
        total_questions: template.total_questions,
        passing_score: template.passing_score,
        class_id: template.class_id,
        description: template.description,
        exam_date: examDate.toISOString().split('T')[0],
        is_recurring: false,
      }

      const { data, error } = await supabase.from('exams').insert(newExam).select('id').single()

      if (error) throw error

      toast({
        title: '시험 생성 완료',
        description: `"${examName}" 시험이 생성되었습니다.`,
      })

      // Redirect to the created exam detail page for student assignment
      if (data?.id) {
        router.push(`/grades/exams/${data.id}`)
      } else {
        router.push('/grades')
      }
    } catch (error: unknown) {
      console.error('Error generating exam:', error)
      const errorMessage = error instanceof Error ? error.message : '시험을 생성하는 중 오류가 발생했습니다.'
      toast({
        title: '생성 오류',
        description: errorMessage,
        variant: 'destructive',
      })
    }
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
            <h1 className="text-3xl font-bold">시험 템플릿 관리</h1>
            <p className="text-muted-foreground">반복되는 시험을 템플릿으로 관리하고 자동 생성하세요</p>
          </div>
          <Button onClick={() => router.push('/grades/exam-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            템플릿 등록
          </Button>
        </div>

        {/* Search */}
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

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
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
                {templates.filter((t) => t.recurring_schedule === 'weekly').length}개
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
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
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
                            <Repeat className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{template.name}</span>
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
                              onClick={() => handleGenerateExam(template)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              시험 생성
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
    </PageWrapper>
  )
}
