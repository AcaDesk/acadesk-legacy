'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { useRouter } from 'next/navigation'
import { format as formatDate, isPast, isToday, isTomorrow, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  CheckCircle,
  Circle,
  Clock,
  Plus,
  ListTodo,
  Calendar,
  Target,
  AlertCircle,
} from 'lucide-react'
import { useStudentDetail } from '@/hooks/use-student-detail'
import { useToast } from '@/hooks/use-toast'
import { completeTodo, uncompleteTodo } from '@/app/actions/todos'
import { getErrorMessage } from '@/lib/error-handlers'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

interface ExtendedTodo {
  priority?: string | null
  description?: string | null
}

export function TodoTab() {
  const router = useRouter()
  const { toast } = useToast()
  const { student, recentTodos, onRefresh } = useStudentDetail()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  // 필터링된 TODO 목록
  const filteredTodos = recentTodos.filter((todo) => {
    if (filter === 'pending') return !todo.completed_at
    if (filter === 'completed') return !!todo.completed_at
    return true
  })

  // TODO 통계
  const totalTodos = recentTodos.length
  const completedTodos = recentTodos.filter((t) => t.completed_at).length
  const pendingTodos = totalTodos - completedTodos
  const overdueTodos = recentTodos.filter(
    (t) => !t.completed_at && t.due_date && isPast(new Date(t.due_date))
  ).length
  const todayTodos = recentTodos.filter(
    (t) => !t.completed_at && t.due_date && isToday(new Date(t.due_date))
  ).length
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

  // TODO 완료/미완료 토글
  const handleToggleTodo = async (todoId: string, currentStatus: boolean) => {
    try {
      let result
      if (currentStatus) {
        // 완료 취소
        result = await uncompleteTodo(todoId)
      } else {
        // 완료 처리
        result = await completeTodo(todoId)
      }

      if (!result.success) {
        toast({
          title: '오류',
          description: result.error || 'TODO 처리 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: currentStatus ? 'TODO 미완료 처리' : 'TODO 완료',
        description: currentStatus ? 'TODO가 미완료로 변경되었습니다.' : 'TODO가 완료되었습니다.',
      })

      onRefresh?.()
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast({
        title: '오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // 날짜 표시 헬퍼
  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null
    const date = new Date(dueDate)

    if (isToday(date)) {
      return { text: '오늘', variant: 'default' as const, urgent: true }
    }
    if (isTomorrow(date)) {
      return { text: '내일', variant: 'outline' as const, urgent: false }
    }
    if (isPast(date)) {
      return { text: '기한 초과', variant: 'destructive' as const, urgent: true }
    }

    const daysUntil = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 3) {
      return { text: `${daysUntil}일 후`, variant: 'outline' as const, urgent: false }
    }

    return {
      text: formatDate(date, 'M월 d일', { locale: ko }),
      variant: 'outline' as const,
      urgent: false,
    }
  }

  // 우선순위 표시
  const getPriorityBadge = (priority: string | null | undefined) => {
    if (!priority) return null

    const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      high: { label: '높음', variant: 'destructive' },
      medium: { label: '보통', variant: 'default' },
      low: { label: '낮음', variant: 'outline' },
    }

    return priorityMap[priority] || null
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Quick Stats */}
      <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">전체 TODO</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{totalTodos}</p>
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">미완료</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{pendingTodos}</p>
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">오늘 할 일</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{todayTodos}</p>
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">기한 초과</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-destructive">{overdueTodos}</p>
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">완료율</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{completionRate}</p>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TODO List */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">TODO 목록</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'pending' | 'completed')}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">미완료</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => router.push('/todos/new')}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                TODO 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTodos.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {filter === 'all'
                  ? '등록된 TODO가 없습니다'
                  : filter === 'pending'
                  ? '미완료 TODO가 없습니다'
                  : '완료된 TODO가 없습니다'}
              </p>
              {filter === 'all' && (
                <Button
                  size="sm"
                  onClick={() => router.push('/todos/new')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  첫 TODO 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTodos.map((todo) => {
                const extendedTodo = todo as typeof todo & ExtendedTodo
                const dueDateInfo = getDueDateDisplay(todo.due_date)
                const priorityInfo = getPriorityBadge(extendedTodo.priority)
                const isCompleted = !!todo.completed_at
                const isOverdue = !isCompleted && todo.due_date && isPast(new Date(todo.due_date))

                return (
                  <div
                    key={todo.id}
                    className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border transition-colors ${
                      isCompleted ? 'bg-muted/30' : isOverdue ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id, isCompleted)}
                      className="shrink-0 mt-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-foreground" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p
                          className={`font-medium text-sm break-words ${
                            isCompleted ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {todo.title}
                        </p>
                        {extendedTodo.description && (
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {extendedTodo.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {dueDateInfo && (
                          <Badge variant={dueDateInfo.variant} className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {dueDateInfo.text}
                          </Badge>
                        )}

                        {priorityInfo && (
                          <Badge variant={priorityInfo.variant} className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {priorityInfo.label}
                          </Badge>
                        )}

                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            지연
                          </Badge>
                        )}

                        {isCompleted && todo.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            완료: {formatDate(new Date(todo.completed_at), 'M월 d일 HH:mm', { locale: ko })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {recentTodos.length > filteredTodos.length && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => router.push('/todos')}
                >
                  전체 TODO 보기 ({recentTodos.length}개)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
