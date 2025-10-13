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
import { CheckCircle, XCircle } from 'lucide-react'
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

interface PendingTodo {
  id: string
  title: string
  subject: string | null
  completed_at: string
  student_id: string
  students: {
    users: {
      name: string
    } | null
  } | null
}

interface StudentData {
  users: {
    name: string
  } | null
}

export default function VerifyTodosPage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 검증" description="학생들이 완료한 과제를 검증하고 피드백을 제공할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 검증" reason="검증 시스템 업데이트가 진행 중입니다." />;
  }

  const [pendingTodos, setPendingTodos] = useState<PendingTodo[]>([])
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set())
  const [feedbackDialog, setFeedbackDialog] = useState(false)
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    if (currentUser) {
      loadPendingTodos()
    }
  }, [currentUser])

  async function loadPendingTodos() {
    if (!currentUser) return

    try {
      // Load todos that are completed but not verified
      const { data, error } = await supabase
        .from('student_todos')
        .select(`
          id,
          title,
          subject,
          completed_at,
          student_id,
          students (
            users (
              name
            )
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .not('completed_at', 'is', null)
        .is('verified_at', null)
        .order('completed_at', { ascending: true })

      if (error) throw error
      setPendingTodos((data as any) || [])
    } catch (error) {
      console.error('Error loading pending todos:', error)
      toast({
        title: '로딩 오류',
        description: '검증 대기 목록을 불러오는 중 오류가 발생했습니다.',
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
      const { error } = await supabase
        .from('student_todos')
        .update({
          verified_by: currentUser!.id,
          verified_at: new Date().toISOString(),
        })
        .in('id', Array.from(selectedTodos))

      if (error) throw error

      toast({
        title: '검증 완료',
        description: `${selectedTodos.size}개의 과제가 검증되었습니다.`,
      })

      // Reload list and clear selection
      setSelectedTodos(new Set())
      await loadPendingTodos()
    } catch (error: any) {
      console.error('Error verifying todos:', error)
      toast({
        title: '검증 실패',
        description: error.message || '과제를 검증하는 중 오류가 발생했습니다.',
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
      const { error } = await supabase
        .from('student_todos')
        .update({
          completed_at: null, // Reset completion
          notes: feedback,
        })
        .eq('id', currentTodoId)

      if (error) throw error

      toast({
        title: '과제 반려',
        description: '과제가 반려되었습니다. 학생에게 피드백이 전달됩니다.',
      })

      setFeedbackDialog(false)
      await loadPendingTodos()
    } catch (error: any) {
      console.error('Error rejecting todo:', error)
      toast({
        title: '반려 실패',
        description: error.message || '과제를 반려하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
      </div>
    </PageWrapper>
  )
}
