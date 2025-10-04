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
import { Plus, Edit, Trash2, Copy, FileText, Calendar, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DAYS_OF_WEEK } from '@/lib/constants'

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

const PRIORITY_LABELS: Record<string, string> = {
  high: '높음',
  normal: '보통',
  low: '낮음',
}

export default function TodoTemplatesPage() {
  const [templates, setTemplates] = useState<TodoTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TodoTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, templates])

  async function loadTemplates() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('todo_templates')
        .select('*')
        .order('day_of_week')
        .order('title')

      if (error) throw error
      setTemplates(data)
      setFilteredTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: '데이터 로드 오류',
        description: '과제 템플릿을 불러오는 중 오류가 발생했습니다.',
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
        const title = template.title?.toLowerCase() || ''
        const description = template.description?.toLowerCase() || ''
        const subject = template.subject?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return title.includes(search) || description.includes(search) || subject.includes(search)
      })
    }

    setFilteredTemplates(filtered)
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
      console.error('Error deleting template:', error)
      toast({
        title: '삭제 오류',
        description: '템플릿을 삭제하는 중 오류가 발생했습니다.',
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
        title: template.active ? '비활성화' : '활성화',
        description: `"${template.title}" 템플릿이 ${template.active ? '비활성화' : '활성화'}되었습니다.`,
      })

      loadTemplates()
    } catch (error) {
      console.error('Error toggling active:', error)
      toast({
        title: '변경 오류',
        description: '템플릿 상태를 변경하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleGenerateTodos(template: TodoTemplate) {
    if (!currentUser) return

    try {
      // Get all active students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .is('deleted_at', null)

      if (studentsError) throw studentsError

      // Calculate due date based on day_of_week
      const today = new Date()
      const targetDayOfWeek = template.day_of_week || today.getDay()
      const daysUntilTarget = (targetDayOfWeek - today.getDay() + 7) % 7
      const dueDate = new Date(today)
      dueDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))

      const todosToCreate = students.map(student => ({
        tenant_id: currentUser.tenantId,
        student_id: student.id,
        title: template.title,
        description: template.description,
        subject: template.subject,
        due_date: dueDate.toISOString().split('T')[0],
        due_day_of_week: targetDayOfWeek,
        priority: template.priority,
        estimated_duration_minutes: template.estimated_duration_minutes,
      }))

      const { error } = await supabase.from('student_todos').insert(todosToCreate)

      if (error) throw error

      toast({
        title: '과제 생성 완료',
        description: `${students.length}명의 학생에게 "${template.title}" 과제가 배정되었습니다.`,
      })

      router.push('/todos')
    } catch (error: any) {
      console.error('Error generating todos:', error)
      toast({
        title: '생성 오류',
        description: error.message || '과제를 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">과제 템플릿 관리</h1>
            <p className="text-muted-foreground">반복되는 과제를 템플릿으로 관리하고 자동으로 배정하세요</p>
          </div>
          <Button onClick={() => router.push('/todos/templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            템플릿 등록
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="템플릿명, 과목, 설명으로 검색..."
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
              등록된 과제 템플릿을 확인하고, 전체 학생에게 일괄 배정할 수 있습니다
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
                      <TableHead>과제명</TableHead>
                      <TableHead>과목</TableHead>
                      <TableHead>요일</TableHead>
                      <TableHead>예상 시간</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.title}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.subject ? (
                            <Badge variant="outline">{template.subject}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.day_of_week !== null ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{DAYS_OF_WEEK[template.day_of_week]}요일</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.estimated_duration_minutes ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{template.estimated_duration_minutes}분</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              template.priority === 'high' ? 'destructive' :
                              template.priority === 'normal' ? 'secondary' :
                              'outline'
                            }
                          >
                            {PRIORITY_LABELS[template.priority || 'normal']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={template.active ? 'outline' : 'ghost'}
                            size="sm"
                            onClick={() => handleToggleActive(template)}
                          >
                            {template.active ? '활성' : '비활성'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGenerateTodos(template)}
                              title="과제 일괄 생성"
                              disabled={!template.active}
                            >
                              <Copy className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/todos/templates/${template.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template.id, template.title)}
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 템플릿 수</CardDescription>
              <CardTitle className="text-3xl">{templates.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>활성 템플릿</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {templates.filter((t) => t.active).length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>높은 우선순위</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {templates.filter((t) => t.priority === 'high').length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>주간 과제</CardDescription>
              <CardTitle className="text-3xl">
                {templates.filter((t) => t.day_of_week !== null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
