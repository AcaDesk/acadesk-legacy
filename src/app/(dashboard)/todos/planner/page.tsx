'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Calendar, Plus, Save, Copy, Search, ChevronLeft, ChevronRight, MousePointer2, Trash2, CheckSquare } from 'lucide-react'
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
import { createGetStudentsUseCase } from '@/application/factories/studentUseCaseFactory.client'
import { createGetTodoTemplatesUseCase } from '@/application/factories/todoTemplateUseCaseFactory.client'
import { createCreateTodosForStudentsUseCase } from '@/application/factories/todoUseCaseFactory.client'
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
  // All Hooks must be called before any early returns
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
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

  // Search and Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const studentsPerPage = 10

  // Multi-cell selection
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)

  // Helper to generate cell key
  function getCellKey(studentId: string, dayOfWeek: number): string {
    return `${studentId}-${dayOfWeek}`
  }

  // Helper to parse cell key
  function parseCellKey(key: string): { studentId: string; dayOfWeek: number } | null {
    const [studentId, dayStr] = key.split('-')
    const dayOfWeek = parseInt(dayStr, 10)
    if (studentId && !isNaN(dayOfWeek)) {
      return { studentId, dayOfWeek }
    }
    return null
  }

  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser) {
      loadTenantId()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (tenantId) {
      loadStudents()
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  // Filter and paginate students
  useEffect(() => {
    let filtered = [...students]

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.users?.name?.toLowerCase().includes(search) ||
          s.student_code?.toLowerCase().includes(search)
      )
    }

    setFilteredStudents(filtered)
    // Reset to first page when search changes
    setCurrentPage(1)
  }, [students, searchTerm])

  async function loadTenantId() {
    if (!currentUser) return

    try {
      const { data } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', currentUser.id)
        .single()

      if (data?.tenant_id) {
        setTenantId(data.tenant_id)
      }
    } catch (error) {
      toast({
        title: '초기화 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadStudents() {
    if (!tenantId) return

    try {
      const getStudentsUseCase = createGetStudentsUseCase()
      const { students: studentList, error } = await getStudentsUseCase.execute({
        tenantId,
      })

      if (error) throw error

      // Use Case에서 반환하는 Student 엔티티를 UI 타입으로 변환
      const mappedStudents = studentList.map(student => ({
        id: student.id,
        student_code: student.studentCode.toString(),
        users: {
          name: student.name,
        },
      }))

      setStudents(mappedStudents)
    } catch (error: unknown) {
      toast({
        title: '학생 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadTemplates() {
    if (!tenantId) return

    try {
      const getTemplatesUseCase = createGetTodoTemplatesUseCase()
      const { templates: templateList, error } = await getTemplatesUseCase.execute({
        tenantId,
      })

      if (error) throw error

      // Use Case에서 반환하는 TodoTemplate 엔티티를 UI 타입으로 변환
      const mappedTemplates = templateList.map(template => ({
        id: template.id,
        title: template.title,
        subject: template.subject,
        estimated_duration_minutes: template.estimatedDurationMinutes,
        priority: template.priority.getValue(),
      }))

      setTemplates(mappedTemplates)
    } catch (error: unknown) {
      toast({
        title: '템플릿 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleCellClick(studentId: string, dayOfWeek: number) {
    // If in selection mode, toggle cell selection
    if (selectionMode) {
      toggleCellSelection(studentId, dayOfWeek)
      return
    }

    // Otherwise, open dialog for single cell
    setSelectedCell({ studentId, dayOfWeek })
    setDialogOpen(true)

    // Load recommended templates based on student's schedule
    await loadRecommendedTemplates(studentId)
  }

  function toggleCellSelection(studentId: string, dayOfWeek: number) {
    const cellKey = getCellKey(studentId, dayOfWeek)
    const newSelection = new Set(selectedCells)

    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey)
    } else {
      newSelection.add(cellKey)
    }

    setSelectedCells(newSelection)
  }

  function clearCellSelection() {
    setSelectedCells(new Set())
    setSelectionMode(false)
  }

  function selectAllVisibleCells() {
    const allCells = new Set<string>()
    paginatedStudents.forEach(student => {
      [1, 2, 3, 4, 5].forEach(day => {
        allCells.add(getCellKey(student.id, day))
      })
    })
    setSelectedCells(allCells)
  }

  function openBulkDialog() {
    if (selectedCells.size === 0) {
      toast({
        title: '셀 선택 필요',
        description: '먼저 작업할 셀들을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }
    setBulkDialogOpen(true)
  }

  function addTodoToBulkCells(template: TodoTemplate) {
    const newTodos: PlannedTodo[] = []

    selectedCells.forEach(cellKey => {
      const parsed = parseCellKey(cellKey)
      if (parsed) {
        newTodos.push({
          studentId: parsed.studentId,
          dayOfWeek: parsed.dayOfWeek,
          templateId: template.id,
          title: template.title,
          subject: template.subject || undefined,
          estimatedDuration: template.estimated_duration_minutes || undefined,
          priority: template.priority,
        })
      }
    })

    setPlannedTodos([...plannedTodos, ...newTodos])
    setBulkDialogOpen(false)
    clearCellSelection()

    toast({
      title: '일괄 과제 추가 완료',
      description: `${selectedCells.size}개 셀에 과제가 추가되었습니다.`,
    })
  }

  function deleteTodosFromBulkCells() {
    if (!confirm(`선택한 ${selectedCells.size}개 셀의 모든 과제를 삭제하시겠습니까?`)) {
      return
    }

    const cellsToDelete = new Set(selectedCells)
    const updatedTodos = plannedTodos.filter(todo => {
      const cellKey = getCellKey(todo.studentId, todo.dayOfWeek)
      return !cellsToDelete.has(cellKey)
    })

    setPlannedTodos(updatedTodos)
    clearCellSelection()

    toast({
      title: '일괄 삭제 완료',
      description: `선택한 셀의 과제가 삭제되었습니다.`,
    })
  }

  async function loadRecommendedTemplates(studentId: string) {
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
      const subjects = new Set<string>();
      (enrollments ?? []).forEach((enrollment) => {
        const classes = Array.isArray(enrollment.classes)
          ? enrollment.classes
          : [enrollment.classes]
        classes.forEach((c) => {
          if (c?.subject) subjects.add(c.subject)
        })
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
    } catch {
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
    if (!tenantId) return
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

      // ✅ Use Server Action instead of direct UseCase
      const { createTodosForStudents } = await import('@/app/actions/todos')

      // Group todos by date and content to batch create
      const groupedTodos = new Map<string, { studentIds: string[], todo: PlannedTodo, dueDate: Date }>()

      plannedTodos.forEach(pt => {
        const dueDate = new Date(monday)
        dueDate.setDate(monday.getDate() + pt.dayOfWeek)

        const key = `${pt.title}-${pt.subject}-${pt.priority}-${dueDate.toISOString().split('T')[0]}`

        if (!groupedTodos.has(key)) {
          groupedTodos.set(key, {
            studentIds: [],
            todo: pt,
            dueDate,
          })
        }
        groupedTodos.get(key)!.studentIds.push(pt.studentId)
      })

      // Create todos for each group via Server Action
      for (const group of groupedTodos.values()) {
        const result = await createTodosForStudents({
          studentIds: group.studentIds,
          title: group.todo.title,
          subject: group.todo.subject,
          dueDate: group.dueDate.toISOString(),
          priority: group.todo.priority as 'low' | 'normal' | 'high' | 'urgent',
          estimatedDurationMinutes: group.todo.estimatedDuration,
        })

        if (!result.success) {
          throw new Error(result.error || 'TODO 생성 실패')
        }
      }

      toast({
        title: '주간 과제 게시 완료',
        description: `${plannedTodos.length}개의 과제가 배정되었습니다.`,
      })

      // Clear planned todos
      setPlannedTodos([])
    } catch (error: unknown) {
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)
  const startIndex = (currentPage - 1) * studentsPerPage
  const endIndex = startIndex + studentsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
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
    } catch {
      // Silent failure for drag & drop errors
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="주간 학습 플래너" description="학생별 주간 과제를 한 화면에서 계획하고 일괄 배정할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="주간 학습 플래너" reason="플래너 시스템 업데이트가 진행 중입니다." />;
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
            {selectedCells.size > 0 && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                선택된 셀: {selectedCells.size}개
              </Badge>
            )}
            {selectionMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={clearCellSelection}
                  className="gap-2"
                >
                  선택 취소
                </Button>
                <Button
                  variant="outline"
                  onClick={selectAllVisibleCells}
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  전체 선택
                </Button>
                <Button
                  variant="outline"
                  onClick={openBulkDialog}
                  disabled={selectedCells.size === 0}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  일괄 추가
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteTodosFromBulkCells}
                  disabled={selectedCells.size === 0}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  일괄 삭제
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setSelectionMode(true)}
                  className="gap-2"
                >
                  <MousePointer2 className="h-4 w-4" />
                  셀 선택 모드
                </Button>
                <Button
                  onClick={publishWeeklyPlan}
                  disabled={loading || plannedTodos.length === 0}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? '게시 중...' : '이번 주 과제 게시'}
                </Button>
              </>
            )}
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
              <div className="flex items-center justify-between">
                <CardTitle>주간 과제 매트릭스</CardTitle>
                <Badge variant="outline" className="text-sm">
                  {filteredStudents.length}명의 학생
                </Badge>
              </div>
              {/* Search Input */}
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="학생 이름 또는 학번으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {searchTerm ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map(student => (
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
                        const cellKey = getCellKey(student.id, dayOfWeek)
                        const isSelected = selectedCells.has(cellKey)
                        return (
                          <td
                            key={dayOfWeek}
                            className={`p-2 align-top cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/20 ring-2 ring-primary ring-inset'
                                : isDropTarget
                                ? 'bg-primary/10 ring-2 ring-primary'
                                : 'hover:bg-primary/5'
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
                  ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} / {filteredStudents.length}명
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        return page === 1 ||
                               page === totalPages ||
                               Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsis = index > 0 && page - array[index - 1] > 1
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        )
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
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

        {/* Bulk Add Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>일괄 과제 추가</DialogTitle>
              <DialogDescription>
                선택한 {selectedCells.size}개 셀에 동일한 과제를 추가합니다
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">과제 템플릿 선택</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  템플릿을 클릭하여 선택한 모든 셀에 추가하세요
                </p>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => addTodoToBulkCells(template)}
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
                  {templates.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">
                      등록된 템플릿이 없습니다
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
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
