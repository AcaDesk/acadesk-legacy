'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { createTodosForStudents, getTenantIdFromStudent, type CreateTodoInput } from '@/services/todo-management.service'
import { getErrorMessage } from '@/lib/error-handlers'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

interface TodoFormData {
  title: string
  description: string
  subject: string
  due_date: string
  priority: string
  student_ids: string[]
}

export default function NewTodoPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="TODO 생성" description="학생별 과제를 손쉽게 생성하고 관리하여 학습 진도를 효율적으로 추적할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="TODO 생성" reason="TODO 시스템 업데이트가 진행 중입니다." />;
  }

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    subject: '',
    due_date: '',
    priority: 'normal',
    student_ids: [],
  })
  const [loading, setLoading] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, student_ids: selectedStudents }))
  }, [selectedStudents])

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_code, users(name)')
        .is('deleted_at', null)
        .order('student_code')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '데이터 로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map((s) => s.id))
    }
    setSelectAll(!selectAll)
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Get tenant_id from first student
      const tenantId = await getTenantIdFromStudent(supabase, selectedStudents[0])

      // Prepare input for service
      const input: CreateTodoInput = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        due_date: formData.due_date,
        priority: formData.priority as 'low' | 'normal' | 'high' | 'urgent',
        student_ids: selectedStudents,
      }

      // Create TODOs for all selected students
      const result = await createTodosForStudents(supabase, tenantId, input)

      toast({
        title: 'TODO 생성 완료',
        description: `${result.todoCount}명의 학생에게 TODO가 생성되었습니다.`,
      })

      router.push('/todos')
    } catch (error) {
      toast({
        title: '생성 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
          <span className="text-foreground font-medium">새 TODO</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">TODO 생성</h1>
          <p className="text-muted-foreground mt-1">
            학생별 과제를 생성합니다 (여러 학생 선택 가능)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TODO Details */}
          <Card>
            <CardHeader>
              <CardTitle>TODO 정보</CardTitle>
              <CardDescription>과제의 기본 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: Vocabulary 51-100 암기"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  placeholder="과제에 대한 상세 설명..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Subject and Priority */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">과목 (선택)</Label>
                  <Input
                    id="subject"
                    placeholder="예: Vocabulary, Reading"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="normal">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date">마감일 *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>학생 선택</CardTitle>
                  <CardDescription>
                    TODO를 배정할 학생을 선택하세요 (여러 명 선택 가능)
                  </CardDescription>
                </div>
                <Badge variant="secondary">{selectedStudents.length}명 선택</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select All */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  전체 선택
                </Label>
              </div>

              {/* Student List */}
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedStudents.includes(student.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <label
                      htmlFor={`student-${student.id}`}
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                    >
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <div>
                        <div className="font-medium">
                          {student.users?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {student.student_code}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {students.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 학생이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/todos')}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? '생성 중...' : `TODO 생성 (${selectedStudents.length}명)`}
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  )
}
