'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { createTodosForStudents } from '@/app/actions/todos'
import { getErrorMessage } from '@/lib/error-handlers'
import { useCurrentUser } from '@/hooks/use-current-user'
import { DatePicker } from '@ui/date-picker'
import { StudentSearch } from '@/components/features/students/student-search'
import { SubjectSelector } from '@/components/features/common/subject-selector'

interface TodoFormData {
  title: string
  description: string
  subject: string
  due_date: string
  priority: string
  student_ids: string[]
}

export default function NewTodoPage() {
  // All Hooks must be called before any early returns
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

  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  // tenantId는 currentUser에서 직접 가져옴
  const tenantId = currentUser?.tenantId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tenantId) {
      toast({
        title: '초기화 필요',
        description: '테넌트 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '최소 한 명의 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const result = await createTodosForStudents({
        studentIds: selectedStudents,
        title: formData.title,
        description: formData.description || undefined,
        subject: formData.subject || undefined,
        dueDate: new Date(formData.due_date).toISOString(),
        priority: formData.priority as 'low' | 'normal' | 'high' | 'urgent',
      })

      if (!result.success) {
        throw new Error(result.error || 'TODO 생성 실패')
      }

      toast({
        title: 'TODO 생성 완료',
        description: `${selectedStudents.length}명의 학생에게 TODO가 생성되었습니다.`,
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

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="TODO 생성" description="학생별 과제를 손쉽게 생성하고 관리하여 학습 진도를 효율적으로 추적할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="TODO 생성" reason="TODO 시스템 업데이트가 진행 중입니다." />;
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
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
                  <SubjectSelector
                    value={formData.subject}
                    onChange={(value) => setFormData({ ...formData, subject: value })}
                    placeholder="과목 선택"
                    showColor={true}
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
                <DatePicker
                  value={formData.due_date ? new Date(formData.due_date) : undefined}
                  onChange={(date) =>
                    setFormData({
                      ...formData,
                      due_date: date ? date.toISOString().split('T')[0] : '',
                    })
                  }
                  placeholder="마감일 선택"
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle>학생 선택</CardTitle>
              <CardDescription>
                TODO를 배정할 학생을 선택하세요 (여러 명 선택 가능)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentSearch
                mode="multiple"
                variant="checkbox-list"
                value={selectedStudents}
                onChange={setSelectedStudents}
                searchable={true}
                showSelectAll={true}
                showSelectedCount={true}
                placeholder="학생 검색..."
              />
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
