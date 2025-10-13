'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Copy, FileText, Repeat, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface ExamTemplate {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  total_questions: number | null
  recurring_schedule: string | null
  is_recurring: boolean
  description: string | null
  class_id: string | null
  classes?: {
    name: string
  } | null
  _count?: {
    generated: number
  }
}

interface ExamCategory {
  code: string
  label: string
}

export default function ExamTemplatesPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.gradesManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="시험 템플릿" description="반복되는 시험을 템플릿으로 관리하고 자동으로 생성하여 업무 효율을 높일 수 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 템플릿" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ExamTemplate[]>([])
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, templates])

  async function loadData() {
    try {
      setLoading(true)

      // Load exam categories
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
          category_code,
          exam_type,
          total_questions,
          recurring_schedule,
          is_recurring,
          description,
          class_id,
          classes (name)
        `)
        .eq('is_recurring', true)
        .is('deleted_at', null)
        .order('name')

      if (templatesError) throw templatesError
      setTemplates(templatesData as any)
      setFilteredTemplates(templatesData as any)
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('exams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      toast({
        title: '삭제 완료',
        description: `${name} 템플릿이 삭제되었습니다.`,
      })

      loadData()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: '삭제 오류',
        description: '템플릿을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleGenerateExam(template: ExamTemplate) {
    if (!currentUser) return

    try {
      // Generate exam name with current date
      const now = new Date()
      const examName = `${template.name} (${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')})`

      const newExam = {
        tenant_id: currentUser.tenantId,
        name: examName,
        category_code: template.category_code,
        exam_type: template.exam_type,
        total_questions: template.total_questions,
        class_id: template.class_id,
        description: template.description,
        exam_date: now.toISOString().split('T')[0],
        is_recurring: false,
      }

      const { error } = await supabase.from('exams').insert(newExam)

      if (error) throw error

      toast({
        title: '시험 생성 완료',
        description: `"${examName}" 시험이 생성되었습니다.`,
      })

      router.push('/grades/exams')
    } catch (error: any) {
      console.error('Error generating exam:', error)
      toast({
        title: '생성 오류',
        description: error.message || '시험을 생성하는 중 오류가 발생했습니다.',
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
    // Parse schedule string (e.g., "weekly", "monthly", etc.)
    const scheduleMap: Record<string, string> = {
      weekly: '주간',
      monthly: '월간',
      quarterly: '분기별',
    }
    return scheduleMap[schedule] || schedule
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
            onClick={() => router.push('/grades')}
            className="hover:text-foreground transition-colors"
          >
            성적 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">시험 템플릿</span>
        </nav>

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
                          {template.classes?.name || '-'}
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
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGenerateExam(template)}
                              title="시험 생성"
                            >
                              <Copy className="h-4 w-4 text-green-600" />
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
      </div>
    </PageWrapper>
  )
}
