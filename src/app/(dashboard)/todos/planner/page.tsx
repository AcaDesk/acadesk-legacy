'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Calendar, Plus, Save, Copy } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { StudentRepository } from '@/services/data/student.repository'
import { TodoRepository } from '@/services/data/todo.repository'
import { getErrorMessage } from '@/lib/error-handlers'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

interface TodoTemplate {
  id: string
  title: string
  subject: string | null
  estimated_duration_minutes: number | null
  priority: string
}

interface PlannedTodo {
  studentId: string
  dayOfWeek: number
  templateId?: string
  title: string
  subject?: string
  estimatedDuration?: number
  priority: string
}

export default function WeeklyPlannerPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="주간 학습 플래너" description="학생별 주간 과제를 한 화면에서 계획하고 일괄 배정할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="주간 학습 플래너" reason="플래너 시스템 업데이트가 진행 중입니다." />;
  }

  const [students, setStudents] = useState<Student[]>([])
  const [templates, setTemplates] = useState<TodoTemplate[]>([])
  const [plannedTodos, setPlannedTodos] = useState<PlannedTodo[]>([])
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; dayOfWeek: number } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [sourceStudentId, setSourceStudentId] = useState<string | null>(null)
  const [targetStudentIds, setTargetStudentIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [dragOverCell, setDragOverCell] = useState<{ studentId: string; dayOfWeek: number } | null>(null)
  const [recommendedTemplates, setRecommendedTemplates] = useState<TodoTemplate[]>([])

  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const studentRepo = new StudentRepository(supabase)
  const todoRepo = new TodoRepository(supabase)

  useEffect(() => {
    if (currentUser) {
      loadStudents()
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  async function loadStudents() {
    if (!currentUser) return

    try {
      const data = await studentRepo.search('', { limit: 1000 })
      setStudents(data as any[])
    } catch (error) {
      toast({
        title: '학생 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadTemplates() {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('todo_templates')
        .select('*')
        .eq('tenant_id', currentUser.tenantId)
        .eq('active', true)
        .order('subject, title')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      toast({
        title: '템플릿 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleCellClick(studentId: string, dayOfWeek: number) {
    setSelectedCell({ studentId, dayOfWeek })
    setDialogOpen(true)

    // Load recommended templates based on student's schedule
    await loadRecommendedTemplates(studentId, dayOfWeek)
  }

  async function loadRecommendedTemplates(studentId: string, _dayOfWeek: number) {
    if (!currentUser) return

    try {
      // Get student's enrolled classes for this day
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
          classes (
            subject
          )
        `)
        .eq('student_id', studentId)
        .eq('active', true)

      if (enrollError) throw enrollError

      // Extract unique subjects
      const subjects = new Set<string>()
      enrollments?.forEach((enrollment: { classes?: { subject?: string } }) => {
        if (enrollment.classes?.subject) {
          subjects.add(enrollment.classes.subject)
        }
      })

      // Filter templates that match the student's subjects
      if (subjects.size > 0) {
        const filtered = templates.filter(t =>
          t.subject && subjects.has(t.subject)
        )
        setRecommendedTemplates(filtered)
      } else {
        setRecommendedTemplates([])
      }
    } catch (error) {
      // Silent failure for recommended templates
      setRecommendedTemplates([])
    }
  }

  function addTodoFromTemplate(template: TodoTemplate) {
    if (!selectedCell) return

    const newTodo: PlannedTodo = {
      studentId: selectedCell.studentId,
      dayOfWeek: selectedCell.dayOfWeek,
      templateId: template.id,
      title: template.title,
      subject: template.subject || undefined,
      estimatedDuration: template.estimated_duration_minutes || undefined,
      priority: template.priority,
    }

    setPlannedTodos([...plannedTodos, newTodo])
    setDialogOpen(false)
    toast({
      title: '과제 추가',
      description: `${template.title}이(가) 추가되었습니다.`,
    })
  }

  function getTodosForCell(studentId: string, dayOfWeek: number) {
    return plannedTodos.filter(
      t => t.studentId === studentId && t.dayOfWeek === dayOfWeek
    )
  }

  async function publishWeeklyPlan() {
    if (!currentUser) return
    if (plannedTodos.length === 0) {
      toast({
        title: '과제 없음',
        description: '먼저 과제를 배정해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Get Monday of current week
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(today.setDate(diff))
      monday.setHours(0, 0, 0, 0)

      // Convert planned todos to actual student_todos
      const todosToInsert = plannedTodos.map(pt => {
        // Calculate due date based on day of week
        const dueDate = new Date(monday)
        dueDate.setDate(monday.getDate() + pt.dayOfWeek)

        return {
          tenant_id: currentUser.tenantId,
          student_id: pt.studentId,
          title: pt.title,
          subject: pt.subject,
          due_date: dueDate.toISOString().split('T')[0],
          priority: pt.priority,
        }
      })

      await todoRepo.createBulk(todosToInsert)

      toast({
        title: '주간 과제 게시 완료',
        description: `${plannedTodos.length}개의 과제가 배정되었습니다.`,
      })

      // Clear planned todos
      setPlannedTodos([])
    } catch (error) {
      toast({
        title: '게시 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function copyStudentPlan(studentId: string) {
    const studentTodos = plannedTodos.filter(t => t.studentId === studentId)

    if (studentTodos.length === 0) {
      toast({
        title: '복사할 과제 없음',
        description: '먼저 과제를 배정해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSourceStudentId(studentId)
    setTargetStudentIds(new Set())
    setCopyDialogOpen(true)
  }

  function toggleStudentSelection(studentId: string) {
    const newSelection = new Set(targetStudentIds)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setTargetStudentIds(newSelection)
  }

  function applyPlanToSelectedStudents() {
    if (!sourceStudentId || targetStudentIds.size === 0) return

    const sourceTodos = plannedTodos.filter(t => t.studentId === sourceStudentId)
    const newTodos: PlannedTodo[] = []

    targetStudentIds.forEach(targetId => {
      sourceTodos.forEach(todo => {
        newTodos.push({
          ...todo,
          studentId: targetId,
        })
      })
    })

    setPlannedTodos([...plannedTodos, ...newTodos])
    setCopyDialogOpen(false)

    toast({
      title: '계획 복사 완료',
      description: `${targetStudentIds.size}명의 학생에게 ${sourceTodos.length}개 과제가 복사되었습니다.`,
    })
  }

  // Drag and Drop handlers
  function handleDragStart(e: React.DragEvent, template: TodoTemplate) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify(template))
  }

  function handleDragOver(e: React.DragEvent, studentId: string, dayOfWeek: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverCell({ studentId, dayOfWeek })
  }

  function handleDragLeave() {
    setDragOverCell(null)
  }

  function handleDrop(e: React.DragEvent, studentId: string, dayOfWeek: number) {
    e.preventDefault()
    setDragOverCell(null)

    try {
      const templateData = e.dataTransfer.getData('application/json')
      if (!templateData) return

      const template: TodoTemplate = JSON.parse(templateData)

      const newTodo: PlannedTodo = {
        studentId,
        dayOfWeek,
        templateId: template.id,
        title: template.title,
        subject: template.subject || undefined,
        estimatedDuration: template.estimated_duration_minutes || undefined,
        priority: template.priority,
      }

      setPlannedTodos([...plannedTodos, newTodo])

      toast({
        title: '과제 추가',
        description: `${template.title}이(가) 추가되었습니다.`,
      })
    } catch (error) {
      // Silent failure for drag & drop errors
    }
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              주간 학습 플래너
            </h1>
            <p className="text-muted-foreground mt-1">
              학생별 주간 과제를 계획하고 일괄 배정하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-base px-4 py-2">
              계획된 과제: {plannedTodos.length}개
            </Badge>
            <Button
              onClick={publishWeeklyPlan}
              disabled={loading || plannedTodos.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? '게시 중...' : '이번 주 과제 게시'}
            </Button>
          </div>
        </div>

        {/* Templates Sidebar and Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">과제 템플릿</CardTitle>
              <p className="text-xs text-muted-foreground">드래그하여 배정</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {templates.map(template => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, template)}
                  className="p-2 border rounded hover:bg-muted/50 cursor-move transition-colors text-sm"
                >
                  <p className="font-medium text-sm truncate">{template.title}</p>
                  <div className="flex gap-1 mt-1">
                    {template.subject && (
                      <Badge variant="secondary" className="text-xs">
                        {template.subject}
                      </Badge>
                    )}
                    {template.estimated_duration_minutes && (
                      <Badge variant="outline" className="text-xs">
                        {template.estimated_duration_minutes}분
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  등록된 템플릿이 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Planner Matrix */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>주간 과제 매트릭스</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-semibold bg-muted/50 sticky left-0 z-10">
                      학생
                    </th>
                    {DAYS_OF_WEEK.slice(1, 6).map((day, index) => (
                      <th key={index} className="p-3 text-center font-semibold bg-muted/50">
                        {day}요일
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium bg-muted/20 sticky left-0 z-10">
                        <div>
                          <p className="font-semibold">{student.users?.name || '이름 없음'}</p>
                          <p className="text-xs text-muted-foreground">{student.student_code}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full gap-1"
                          onClick={() => copyStudentPlan(student.id)}
                        >
                          <Copy className="h-3 w-3" />
                          계획 복사
                        </Button>
                      </td>
                      {[1, 2, 3, 4, 5].map(dayOfWeek => {
                        const isDropTarget = dragOverCell?.studentId === student.id && dragOverCell?.dayOfWeek === dayOfWeek
                        return (
                          <td
                            key={dayOfWeek}
                            className={`p-2 align-top cursor-pointer hover:bg-primary/5 transition-colors ${
                              isDropTarget ? 'bg-primary/10 ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handleCellClick(student.id, dayOfWeek)}
                            onDragOver={(e) => handleDragOver(e, student.id, dayOfWeek)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, student.id, dayOfWeek)}
                          >
                            <div className="min-h-[80px] space-y-1">
                              {getTodosForCell(student.id, dayOfWeek).map((todo, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-2 rounded border bg-card hover:shadow-sm"
                                >
                                  <p className="font-medium truncate">{todo.title}</p>
                                  {todo.subject && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {todo.subject}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                              {getTodosForCell(student.id, dayOfWeek).length === 0 && (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <Plus className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Todo Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>과제 추가</DialogTitle>
              <DialogDescription>
                템플릿을 선택하거나 새로운 과제를 입력하세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Recommended Templates */}
              {recommendedTemplates.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    ✨ 추천 과제
                    <Badge variant="default" className="text-xs">
                      수강 과목 기반
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    학생의 수강 과목과 일치하는 과제입니다
                  </p>
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {recommendedTemplates.map(template => (
                      <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, template)}
                        className="p-3 border-2 border-primary/50 bg-primary/5 rounded-lg hover:bg-primary/10 cursor-move transition-colors"
                        onClick={() => addTodoFromTemplate(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{template.title}</p>
                            <div className="flex gap-2 mt-1">
                              {template.subject && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.subject}
                                </Badge>
                              )}
                              {template.estimated_duration_minutes && (
                                <Badge variant="outline" className="text-xs">
                                  {template.estimated_duration_minutes}분
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Templates */}
              <div>
                <h3 className="font-semibold mb-2">
                  {recommendedTemplates.length > 0 ? '전체 과제 템플릿' : '과제 템플릿'}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  클릭하거나 드래그하여 과제를 추가하세요
                </p>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, template)}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-move transition-colors"
                      onClick={() => addTodoFromTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{template.title}</p>
                          <div className="flex gap-2 mt-1">
                            {template.subject && (
                              <Badge variant="secondary" className="text-xs">
                                {template.subject}
                              </Badge>
                            )}
                            {template.estimated_duration_minutes && (
                              <Badge variant="outline" className="text-xs">
                                {template.estimated_duration_minutes}분
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Copy Plan Dialog */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>주간 계획 복사</DialogTitle>
              <DialogDescription>
                {sourceStudentId && students.find(s => s.id === sourceStudentId)?.users?.name}님의 계획을 다른 학생에게 복사합니다
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">대상 학생 선택</h3>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                  {students
                    .filter(s => s.id !== sourceStudentId)
                    .map(student => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => toggleStudentSelection(student.id)}
                      >
                        <Checkbox
                          checked={targetStudentIds.has(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{student.users?.name || '이름 없음'}</p>
                          <p className="text-xs text-muted-foreground">{student.student_code}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  선택된 학생: <strong>{targetStudentIds.size}명</strong>
                </p>
                {sourceStudentId && (
                  <p className="text-sm text-muted-foreground">
                    복사할 과제: {plannedTodos.filter(t => t.studentId === sourceStudentId).length}개
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={applyPlanToSelectedStudents}
                disabled={targetStudentIds.size === 0}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {targetStudentIds.size}명에게 복사
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  )
}
