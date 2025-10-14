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
import { CheckCircle, XCircle, Eye, Calendar, User, Flag } from 'lucide-react'
import { formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { TodoRepository, type StudentTodoWithStudent } from '@/services/data/todo.repository'
import { verifyTodos, rejectTodo as rejectTodoService } from '@/services/todo-management.service'
import { getErrorMessage } from '@/lib/error-handlers'

export default function VerifyTodosPage() {
  // All Hooks must be called before any early returns
  const [pendingTodos, setPendingTodos] = useState<StudentTodoWithStudent[]>([])
  const [filteredTodos, setFilteredTodos] = useState<StudentTodoWithStudent[]>([])
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set())
  const [feedbackDialog, setFeedbackDialog] = useState(false)
  const [detailDialog, setDetailDialog] = useState(false)
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null)
  const [currentTodo, setCurrentTodo] = useState<StudentTodoWithStudent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  // Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'completed_at' | 'due_date' | 'priority' | 'student_name'>('completed_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const todoRepo = new TodoRepository(supabase)

  useEffect(() => {
    if (currentUser) {
      loadPendingTodos()
    }
  }, [currentUser])

  // Apply filters and sorting whenever data or filter/sort options change
  useEffect(() => {
    applyFiltersAndSort()
  }, [pendingTodos, searchTerm, subjectFilter, priorityFilter, sortBy, sortOrder])

  async function loadPendingTodos() {
    if (!currentUser) return

    try {
      // Load todos that are completed but not verified
      const data = await todoRepo.findAll({ status: 'completed' })
      setPendingTodos(data)
    } catch (error) {
      toast({
        title: '로딩 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  function toggleTodoSelection(todoId: string) {
    const newSelection = new Set(selectedTodos)
    if (newSelection.has(todoId)) {
      newSelection.delete(todoId)
    } else {
      newSelection.add(todoId)
    }
    setSelectedTodos(newSelection)
  }

  function selectAll() {
    if (selectedTodos.size === pendingTodos.length) {
      setSelectedTodos(new Set())
    } else {
      setSelectedTodos(new Set(pendingTodos.map(t => t.id)))
    }
  }

  async function verifySelectedTodos() {
    if (!currentUser) return
    if (selectedTodos.size === 0) {
      toast({
        title: '선택 필요',
        description: '검증할 과제를 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await verifyTodos(supabase, Array.from(selectedTodos), currentUser.id)

      toast({
        title: '검증 완료',
        description: `${selectedTodos.size}개의 과제가 검증되었습니다.`,
      })

      // Reload list and clear selection
      setSelectedTodos(new Set())
      await loadPendingTodos()
    } catch (error) {
      toast({
        title: '검증 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function openFeedbackDialog(todoId: string) {
    setCurrentTodoId(todoId)
    setFeedback('')
    setFeedbackDialog(true)
  }

  function openDetailDialog(todo: StudentTodoWithStudent) {
    setCurrentTodo(todo)
    setDetailDialog(true)
  }

  const priorityLabels = {
    low: '낮음',
    normal: '보통',
    high: '높음',
    urgent: '긴급',
  }

  const priorityColors = {
    low: 'bg-gray-500',
    normal: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  }

  async function rejectTodo() {
    if (!currentTodoId || !feedback.trim()) {
      toast({
        title: '피드백 필요',
        description: '반려 사유를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await rejectTodoService(supabase, currentTodoId, feedback)

      toast({
        title: '과제 반려',
        description: '과제가 반려되었습니다. 학생에게 피드백이 전달됩니다.',
      })

      setFeedbackDialog(false)
      await loadPendingTodos()
    } catch (error) {
      toast({
        title: '반려 실패',
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
    return <ComingSoon featureName="과제 검증" description="학생들이 완료한 과제를 검증하고 피드백을 제공할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 검증" reason="검증 시스템 업데이트가 진행 중입니다." />;
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              검증 대기 목록
            </h1>
            <p className="text-muted-foreground mt-1">
              학생들이 완료한 과제를 검증하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-base px-4 py-2">
              대기 중: {pendingTodos.length}개
            </Badge>
            <Button
              onClick={selectAll}
              variant="outline"
              disabled={pendingTodos.length === 0}
            >
              {selectedTodos.size === pendingTodos.length ? '전체 선택 해제' : '전체 선택'}
            </Button>
            <Button
              onClick={verifySelectedTodos}
              disabled={loading || selectedTodos.size === 0}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? '검증 중...' : `선택 항목 검증 (${selectedTodos.size})`}
            </Button>
          </div>
        </div>

        {/* Pending Todos List */}
        <Card>
          <CardHeader>
            <CardTitle>검증 대기 과제</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTodos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>검증 대기 중인 과제가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTodos.map(todo => (
                  <div
                    key={todo.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      selectedTodos.has(todo.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTodos.has(todo.id)}
                        onCheckedChange={() => toggleTodoSelection(todo.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{todo.title}</p>
                            <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{todo.students?.users?.name || '이름 없음'}</span>
                              {todo.subject && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {todo.subject}
                                  </Badge>
                                </>
                              )}
                              <span>•</span>
                              <span>
                                {formatDate(new Date(todo.completed_at), 'MM/dd HH:mm', { locale: ko })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailDialog(todo)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              상세
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFeedbackDialog(todo.id)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                              반려
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>과제 반려</DialogTitle>
              <DialogDescription>
                반려 사유를 입력하면 학생에게 피드백이 전달됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">반려 사유 *</Label>
                <Textarea
                  id="feedback"
                  placeholder="예: 오답이 많으니 다시 풀어보세요."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackDialog(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={rejectTodo}
                disabled={loading || !feedback.trim()}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {loading ? '반려 중...' : '반려하기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>과제 상세 정보</DialogTitle>
              <DialogDescription>
                과제의 모든 정보를 확인하세요
              </DialogDescription>
            </DialogHeader>

            {currentTodo && (
              <div className="space-y-4">
                {/* Student Info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">학생 정보</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">이름:</span>{' '}
                      <span className="font-medium">{currentTodo.students?.users?.name || '이름 없음'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">학번:</span>{' '}
                      <span className="font-medium">{currentTodo.students?.student_code || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* TODO Info */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">제목</Label>
                    <p className="text-base mt-1">{currentTodo.title}</p>
                  </div>

                  {currentTodo.description && (
                    <div>
                      <Label className="text-sm font-semibold">설명</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {currentTodo.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {currentTodo.subject && (
                      <div>
                        <Label className="text-sm font-semibold">과목</Label>
                        <div className="mt-1">
                          <Badge variant="secondary">{currentTodo.subject}</Badge>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <Flag className="h-3 w-3" />
                        우선순위
                      </Label>
                      <div className="mt-1">
                        <Badge
                          className={priorityColors[currentTodo.priority as keyof typeof priorityColors]}
                        >
                          {priorityLabels[currentTodo.priority as keyof typeof priorityLabels]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        마감일
                      </Label>
                      <p className="text-sm mt-1">
                        {formatDate(new Date(currentTodo.due_date), 'yyyy년 MM월 dd일 (EEE)', {
                          locale: ko,
                        })}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        완료 시간
                      </Label>
                      <p className="text-sm mt-1">
                        {formatDate(new Date(currentTodo.completed_at), 'yyyy년 MM월 dd일 HH:mm', {
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(false)}>
                닫기
              </Button>
              {currentTodo && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDetailDialog(false)
                      openFeedbackDialog(currentTodo.id)
                    }}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    반려
                  </Button>
                  <Button
                    onClick={async () => {
                      if (currentUser && currentTodo) {
                        setLoading(true)
                        try {
                          await verifyTodos(supabase, [currentTodo.id], currentUser.id)
                          toast({
                            title: '검증 완료',
                            description: '과제가 검증되었습니다.',
                          })
                          setDetailDialog(false)
                          await loadPendingTodos()
                        } catch (error) {
                          toast({
                            title: '검증 실패',
                            description: getErrorMessage(error),
                            variant: 'destructive',
                          })
                        } finally {
                          setLoading(false)
                        }
                      }
                    }}
                    disabled={loading}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {loading ? '검증 중...' : '검증'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  )
}
