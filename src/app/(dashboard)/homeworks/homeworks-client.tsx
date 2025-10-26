'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Input } from '@ui/input'
import { EmptyState } from '@ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  Plus,
  CheckCircle2,
  Circle,
  User,
  Search,
  Calendar,
  BookCopy,
  Clock,
  Star,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { deleteHomework } from '@/app/actions/homeworks'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface Homework {
  id: string
  tenant_id: string
  student_id: string
  assigned_by: string | null
  title: string
  description: string | null
  subject: string | null
  priority: string
  due_date: string
  completed_at: string | null
  verified_at: string | null
  created_at: string
  submission_id: string | null
  submitted_at: string | null
  graded_at: string | null
  score: number | null
  is_late: boolean | null
}

interface HomeworkWithStudent extends Homework {
  students?: {
    student_code: string
    user_id?: {
      name: string
    } | null
  } | null
}

interface HomeworksClientProps {
  initialHomeworks: HomeworkWithStudent[]
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

export function HomeworksClient({ initialHomeworks }: HomeworksClientProps) {
  const [filteredHomeworks, setFilteredHomeworks] = useState<HomeworkWithStudent[]>(initialHomeworks)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>(
    'all'
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  // Calculate stats from initial homeworks
  const stats = {
    total: initialHomeworks.length,
    pending: initialHomeworks.filter((h) => !h.submitted_at).length,
    submitted: initialHomeworks.filter((h) => h.submitted_at && !h.graded_at).length,
    graded: initialHomeworks.filter((h) => h.graded_at).length,
  }

  // Filter homeworks whenever search or status changes
  useEffect(() => {
    let filtered = [...initialHomeworks]

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter((h) => !h.submitted_at)
    } else if (statusFilter === 'submitted') {
      filtered = filtered.filter((h) => h.submitted_at && !h.graded_at)
    } else if (statusFilter === 'graded') {
      filtered = filtered.filter((h) => h.graded_at)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (h) =>
          h.title.toLowerCase().includes(search) ||
          h.subject?.toLowerCase().includes(search) ||
          h.students?.user_id?.name?.toLowerCase().includes(search) ||
          h.students?.student_code?.toLowerCase().includes(search)
      )
    }

    setFilteredHomeworks(filtered)
  }, [searchTerm, statusFilter, initialHomeworks])

  function handleDeleteClick(homeworkId: string, title: string) {
    setItemToDelete({ id: homeworkId, name: title })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteHomework(itemToDelete.id)

      if (result.success) {
        toast({
          title: '삭제 완료',
          description: '숙제가 삭제되었습니다.',
        })
        window.location.reload()
      } else {
        toast({
          title: '삭제 오류',
          description: result.error,
          variant: 'destructive',
        })
      }
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  function getStatusBadge(homework: HomeworkWithStudent) {
    if (homework.graded_at) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <Badge variant="outline" className="bg-green-50">
            채점 완료
          </Badge>
          {homework.score !== null && (
            <Badge variant="default">{homework.score}점</Badge>
          )}
        </div>
      )
    } else if (homework.submitted_at) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <Badge variant="outline" className="bg-blue-50">
            제출 완료
          </Badge>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2">
          <Circle className="h-5 w-5 text-muted-foreground" />
          <Badge variant="secondary">미제출</Badge>
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <section aria-label="통계">
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">전체 숙제</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'pending' ? 'ring-2 ring-orange-600 bg-orange-50 dark:bg-orange-950/20' : ''
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">미제출</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">제출 대기 중</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'submitted' ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
            onClick={() => setStatusFilter('submitted')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                제출 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
              <p className="text-xs text-muted-foreground mt-1">채점 대기 중</p>
            </CardContent>
          </Card>

          <Card
            className={`hover:shadow-md transition-all cursor-pointer ${
              statusFilter === 'graded' ? 'ring-2 ring-green-600 bg-green-50 dark:bg-green-950/20' : ''
            }`}
            onClick={() => setStatusFilter('graded')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">채점 완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.graded}</div>
              <p className="text-xs text-muted-foreground mt-1">최종 완료</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filters */}
      <section aria-label="필터">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="숙제 제목, 학생 이름, 학번으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="pending">미제출</TabsTrigger>
                  <TabsTrigger value="submitted">제출완료</TabsTrigger>
                  <TabsTrigger value="graded">채점완료</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Homework List */}
      <section aria-label="숙제 목록">
        <Card>
          <CardContent className="pt-6">
            {filteredHomeworks.length === 0 ? (
              <EmptyState
                icon={searchTerm ? Search : BookCopy}
                title={searchTerm ? '검색 결과가 없습니다' : '숙제가 없습니다'}
                description={
                  searchTerm ? '다른 검색어를 입력해보세요' : '새로운 숙제를 출제하여 시작하세요'
                }
                action={
                  !searchTerm && (
                    <Link href="/homeworks/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        숙제 출제
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
                    {filteredHomeworks.map((homework) => (
                      <TableRow key={homework.id}>
                        <TableCell>{getStatusBadge(homework)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{homework.title}</div>
                            {homework.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {homework.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">
                                {homework.students?.user_id?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {homework.students?.student_code || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {homework.subject ? (
                            <Badge variant="outline">{homework.subject}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={priorityColors[homework.priority as keyof typeof priorityColors]}
                          >
                            {priorityLabels[homework.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(homework.due_date).toLocaleDateString('ko-KR')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(homework.id, homework.title)}
                          >
                            삭제
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={itemToDelete ? `"${itemToDelete.name}"이(가) 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
