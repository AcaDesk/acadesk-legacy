'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  CheckCircle2,
  Circle,
  User,
  Search,
  Calendar,
  ListTodo,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { StudentTodoWithStudent } from '@/types/todo.types'
import { verifyTodoAction, deleteTodoAction } from './actions'

interface TodosClientProps {
  initialTodos: StudentTodoWithStudent[]
}

const priorityColors = {
  low: 'bg-gray-500',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

const priorityLabels = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
}

export function TodosClient({ initialTodos }: TodosClientProps) {
  const [filteredTodos, setFilteredTodos] = useState<StudentTodoWithStudent[]>(initialTodos)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'verified'>(
    'all'
  )
  const [isPending, startTransition] = useTransition()

  const { toast } = useToast()

  // Calculate stats from initial todos
  const stats = {
    total: initialTodos.length,
    pending: initialTodos.filter((t) => !t.completed_at).length,
    completed: initialTodos.filter((t) => t.completed_at && !t.verified_at).length,
    verified: initialTodos.filter((t) => t.verified_at).length,
  }

  // Filter todos whenever search or status changes
  useEffect(() => {
    let filtered = [...initialTodos]

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter((t) => !t.completed_at)
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((t) => t.completed_at && !t.verified_at)
    } else if (statusFilter === 'verified') {
      filtered = filtered.filter((t) => t.verified_at)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          t.subject?.toLowerCase().includes(search) ||
          t.students?.name?.toLowerCase().includes(search) ||
          t.students?.student_code?.toLowerCase().includes(search)
      )
    }

    setFilteredTodos(filtered)
  }, [searchTerm, statusFilter, initialTodos])

  async function handleVerify(todoId: string) {
    startTransition(async () => {
      const result = await verifyTodoAction(todoId)

      if (result.success) {
        toast({
          title: '검증 완료',
          description: result.message,
        })
      } else {
        toast({
          title: '검증 오류',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  async function handleDelete(todoId: string) {
    if (!confirm('이 TODO를 삭제하시겠습니까?')) return

    startTransition(async () => {
      const result = await deleteTodoAction(todoId)

      if (result.success) {
        toast({
          title: '삭제 완료',
          description: result.message,
        })
      } else {
        toast({
          title: '삭제 오류',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  // Handle stats card click
  function handleStatsCardClick(filter: 'all' | 'pending' | 'completed' | 'verified') {
    setStatusFilter(filter)
    setSearchTerm('') // Clear search when clicking stats card
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Interactive */}
      <section
        aria-label="통계"
        className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '200ms' }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => handleStatsCardClick('all')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">전체 TODO</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'pending' ? 'ring-2 ring-orange-600 bg-orange-50 dark:bg-orange-950/20' : ''
            }`}
            onClick={() => handleStatsCardClick('pending')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">진행 중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">아직 미완료</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'completed' ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
            onClick={() => handleStatsCardClick('completed')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                완료 (미검증)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">검증 대기 중</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'verified' ? 'ring-2 ring-green-600 bg-green-50 dark:bg-green-950/20' : ''
            }`}
            onClick={() => handleStatsCardClick('verified')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">검증 완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-xs text-muted-foreground mt-1">최종 완료</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filters */}
      <section
        aria-label="필터"
        className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '300ms' }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="TODO 제목, 학생 이름, 학번으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="pending">진행 중</TabsTrigger>
                  <TabsTrigger value="completed">완료</TabsTrigger>
                  <TabsTrigger value="verified">검증됨</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* TODO List */}
      <section
        aria-label="TODO 목록"
        className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '400ms' }}
      >
        <Card>
          <CardContent className="pt-6">
            {filteredTodos.length === 0 ? (
              <EmptyState
                icon={searchTerm ? Search : ListTodo}
                title={searchTerm ? '검색 결과가 없습니다' : 'TODO가 없습니다'}
                description={
                  searchTerm ? '다른 검색어를 입력해보세요' : '새로운 TODO를 생성하여 시작하세요'
                }
                action={
                  !searchTerm && (
                    <Link href="/todos/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        TODO 생성
                      </Button>
                    </Link>
                  )
                }
              />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">상태</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>과목</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>마감일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTodos.map((todo) => (
                      <TableRow key={todo.id}>
                        <TableCell>
                          {todo.verified_at ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : todo.completed_at ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{todo.title}</div>
                            {todo.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {todo.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">{todo.students?.name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {todo.students?.student_code || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {todo.subject ? (
                            <Badge variant="outline">{todo.subject}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={priorityColors[todo.priority as keyof typeof priorityColors]}
                          >
                            {priorityLabels[todo.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(todo.due_date).toLocaleDateString('ko-KR')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {todo.completed_at && !todo.verified_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerify(todo.id)}
                                disabled={isPending}
                              >
                                검증
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(todo.id)}
                              disabled={isPending}
                            >
                              삭제
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
      </section>
    </div>
  )
}
