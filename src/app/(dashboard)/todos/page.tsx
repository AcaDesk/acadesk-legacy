'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
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
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { TodoRepository, type StudentTodoWithStudent } from '@/services/data/todo.repository'
import { verifyTodo, deleteTodo } from '@/services/todo-management.service'
import { getErrorMessage } from '@/lib/error-handlers'

interface Todo {
  id: string
  title: string
  description: string | null
  subject: string | null
  due_date: string
  priority: string
  completed_at: string | null
  verified_at: string | null
  verified_by: string | null
  students: {
    student_code: string
    users: {
      name: string
    } | null
  } | null
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

export default function TodosPage() {
  const [todos, setTodos] = useState<StudentTodoWithStudent[]>([])
  const [filteredTodos, setFilteredTodos] = useState<StudentTodoWithStudent[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'verified'>('all')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const supabase = createClient()
  const todoRepo = new TodoRepository(supabase)

  useEffect(() => {
    loadTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, todos])

  async function loadTodos() {
    try {
      setLoading(true)
      const data = await todoRepo.findAll()
      setTodos(data)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterTodos() {
    let filtered = [...todos]

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
          t.students?.users?.name?.toLowerCase().includes(search) ||
          t.students?.student_code?.toLowerCase().includes(search)
      )
    }

    setFilteredTodos(filtered)
  }

  async function handleVerify(todoId: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: '인증 오류',
          description: '로그인이 필요합니다.',
          variant: 'destructive',
        })
        return
      }

      await verifyTodo(supabase, todoId, user.id)

      toast({
        title: '검증 완료',
        description: 'TODO가 검증되었습니다.',
      })

      loadTodos()
    } catch (error) {
      toast({
        title: '검증 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(todoId: string) {
    if (!confirm('이 TODO를 삭제하시겠습니까?')) return

    try {
      await deleteTodo(supabase, todoId)

      toast({
        title: '삭제 완료',
        description: 'TODO가 삭제되었습니다.',
      })

      loadTodos()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const stats = {
    total: todos.length,
    pending: todos.filter((t) => !t.completed_at).length,
    completed: todos.filter((t) => t.completed_at && !t.verified_at).length,
    verified: todos.filter((t) => t.verified_at).length,
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TODO 관리</h1>
            <p className="text-muted-foreground">학생별 과제 및 TODO를 관리합니다</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/todos/templates'}>
              <FileText className="h-4 w-4 mr-2" />
              템플릿 관리
            </Button>
            <Button onClick={() => window.location.href = '/todos/new'}>
              <Plus className="h-4 w-4 mr-2" />
              TODO 생성
            </Button>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className="hover:bg-accent transition-colors cursor-pointer border-2 border-primary/20"
            onClick={() => window.location.href = '/todos/planner'}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                주간 학습 플래너
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                드래그 앤 드롭으로 주간 과제 배정
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-accent transition-colors cursor-pointer border-2 border-blue-500/20"
            onClick={() => window.location.href = '/todos/verify'}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                검증 대기 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                완료된 과제 일괄 검증
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-accent transition-colors cursor-pointer border-2 border-green-500/20"
            onClick={() => window.location.href = '/kiosk'}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                학생 키오스크
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                학생용 과제 확인 모드
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-accent transition-colors cursor-pointer border-2 border-orange-500/20"
            onClick={() => window.location.href = '/todos/stats'}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                통계 대시보드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                과제 완료 현황 분석
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                전체
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                진행 중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                완료 (미검증)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                검증 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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

        {/* TODO List */}
        <Card>
          <CardContent className="pt-6">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>TODO가 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
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
                              <div className="text-sm">
                                {todo.students?.users?.name || 'Unknown'}
                              </div>
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
                              >
                                검증
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(todo.id)}
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
      </div>
    </PageWrapper>
  )
}
