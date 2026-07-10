'use client'

import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Input } from '@ui/input'
import { Checkbox } from '@ui/checkbox'
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
  XCircle,
  User,
  Search,
  Calendar,
  BookCopy,
  Star,
  Loader2,
  ClipboardCheck,
  Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { deleteHomework, submitHomework, sendHomeworkNotificationToGuardians } from '@/app/actions/homeworks'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { GradeDialog } from './grade-dialog'

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
  feedback: string | null
  text_answer: string | null
  attachment_urls: string[] | null
}

interface HomeworkWithStudent extends Homework {
  students?: {
    student_code: string
    user_id?: { name: string } | null
  } | null
}

interface HomeworksClientProps {
  initialHomeworks: HomeworkWithStudent[]
}

const priorityColors = {
  low: 'bg-gray-500',
  normal: 'bg-info',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

const priorityLabels = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
}

type StatusFilter = 'all' | 'pending' | 'submitted' | 'graded'

export function HomeworksClient({ initialHomeworks }: HomeworksClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [gradeTarget, setGradeTarget] = useState<HomeworkWithStudent | null>(null)
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [itemToNotify, setItemToNotify] = useState<{ id: string; title: string; studentName: string } | null>(null)
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const { toast } = useToast()

  const stats = useMemo(() => ({
    total: initialHomeworks.length,
    pending: initialHomeworks.filter((h) => !h.submitted_at).length,
    submitted: initialHomeworks.filter((h) => h.submitted_at && !h.graded_at).length,
    graded: initialHomeworks.filter((h) => h.graded_at).length,
  }), [initialHomeworks])

  const filteredHomeworks = useMemo(() => {
    let result = initialHomeworks

    if (statusFilter === 'pending') result = result.filter((h) => !h.submitted_at)
    else if (statusFilter === 'submitted') result = result.filter((h) => h.submitted_at && !h.graded_at)
    else if (statusFilter === 'graded') result = result.filter((h) => h.graded_at)

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (h) =>
          h.title.toLowerCase().includes(search) ||
          h.subject?.toLowerCase().includes(search) ||
          h.students?.user_id?.name?.toLowerCase().includes(search) ||
          h.students?.student_code?.toLowerCase().includes(search)
      )
    }

    return result
  }, [initialHomeworks, statusFilter, searchTerm])

  // 선택 관련
  const allSelected = filteredHomeworks.length > 0 && filteredHomeworks.every((h) => selectedIds.has(h.id))
  const someSelected = filteredHomeworks.some((h) => selectedIds.has(h.id)) && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredHomeworks.map((h) => h.id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectedUnsubmitted = useMemo(
    () => filteredHomeworks.filter((h) => selectedIds.has(h.id) && !h.submitted_at),
    [filteredHomeworks, selectedIds]
  )

  // 개별 제출 처리
  const submitSingleMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const result = await submitHomework({ taskId })
      if (!result.success) throw new Error(result.error ?? '제출 오류')
    },
    onSuccess: () => {
      toast({ title: '제출 처리 완료' })
      window.location.reload()
    },
    onError: (error: Error) => {
      toast({ title: '제출 오류', description: error.message, variant: 'destructive' })
    },
  })
  const submittingId = submitSingleMutation.isPending ? submitSingleMutation.variables : null

  function handleSubmitSingle(taskId: string) {
    submitSingleMutation.mutate(taskId)
  }

  // 일괄 제출 처리
  async function handleBulkSubmit() {
    if (selectedUnsubmitted.length === 0) return
    setIsBulkSubmitting(true)
    try {
      const results = await Promise.allSettled(
        selectedUnsubmitted.map((h) => submitHomework({ taskId: h.id }))
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
      const failed = results.length - succeeded

      if (failed === 0) {
        toast({ title: `${succeeded}건 제출 처리 완료` })
      } else {
        toast({ title: `${succeeded}건 성공, ${failed}건 실패`, variant: 'destructive' })
      }
      setSelectedIds(new Set())
      window.location.reload()
    } catch {
      toast({ title: '일괄 처리 오류', variant: 'destructive' })
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  // 부모님께 발송
  function handleSendNotificationClick(homework: HomeworkWithStudent) {
    setItemToNotify({
      id: homework.id,
      title: homework.title,
      studentName: homework.students?.user_id?.name ?? '학생',
    })
    setNotifyDialogOpen(true)
  }

  async function handleConfirmSendNotification() {
    if (!itemToNotify) return
    setIsSendingNotification(true)
    try {
      const result = await sendHomeworkNotificationToGuardians(itemToNotify.id)
      if (result.success) {
        const { successCount, failCount } = result.data
        if (failCount > 0 && successCount > 0) {
          toast({
            title: `발송 완료 (일부 실패)`,
            description: `${successCount}명 성공, ${failCount}명 실패`,
            variant: 'destructive',
          })
        } else {
          toast({ title: '발송 완료', description: `${successCount}명의 보호자에게 숙제 안내가 발송되었습니다.` })
        }
      } else {
        toast({ title: '발송 실패', description: result.error ?? undefined, variant: 'destructive' })
      }
    } catch {
      toast({ title: '발송 오류', variant: 'destructive' })
    } finally {
      setIsSendingNotification(false)
      setNotifyDialogOpen(false)
      setItemToNotify(null)
    }
  }

  // 삭제
  function handleDeleteClick(id: string, title: string) {
    setItemToDelete({ id, name: title })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteHomework(itemToDelete.id)
      if (result.success) {
        toast({ title: '삭제 완료' })
        window.location.reload()
      } else {
        toast({ title: '삭제 오류', description: result.error ?? undefined, variant: 'destructive' })
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
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <Badge variant="outline" className="bg-green-50">채점 완료</Badge>
          {homework.score !== null && <Badge variant="default">{homework.score}점</Badge>}
        </div>
      )
    }
    if (homework.submitted_at) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-info" />
          <Badge variant="outline" className="bg-info/10">제출 완료</Badge>
        </div>
      )
    }
    const isOverdue = new Date(homework.due_date) < new Date()
    return (
      <div className="flex items-center gap-2">
        {isOverdue
          ? <XCircle className="h-4 w-4 text-red-500" />
          : <Circle className="h-4 w-4 text-muted-foreground" />}
        {isOverdue
          ? <Badge variant="destructive">미제출 (기한초과)</Badge>
          : <Badge variant="secondary">미제출</Badge>}
      </div>
    )
  }

  // GradeDialog용 타입 변환
  const gradeDialogData = gradeTarget
    ? {
        ...gradeTarget,
        student_name: gradeTarget.students?.user_id?.name ?? 'Unknown',
        student_code: gradeTarget.students?.student_code ?? '-',
        feedback: gradeTarget.feedback ?? null,
        text_answer: gradeTarget.text_answer ?? null,
        attachment_urls: gradeTarget.attachment_urls ?? null,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <section aria-label="통계">
        <div className="grid gap-4 md:grid-cols-4">
          {(
            [
              { key: 'all', label: '전체', value: stats.total, sub: '전체 숙제', color: 'text-foreground', ring: 'ring-primary bg-primary/5' },
              { key: 'pending', label: '미제출', value: stats.pending, sub: '제출 대기 중', color: 'text-orange-600', ring: 'ring-orange-600 bg-orange-50 dark:bg-orange-950/20' },
              { key: 'submitted', label: '제출 완료', value: stats.submitted, sub: '채점 대기 중', color: 'text-info', ring: 'ring-info bg-info/10' },
              { key: 'graded', label: '채점 완료', value: stats.graded, sub: '최종 완료', color: 'text-green-600', ring: 'ring-green-600 bg-green-50 dark:bg-green-950/20' },
            ] as const
          ).map(({ key, label, value, sub, color, ring }) => (
            <Card
              key={key}
              className={`hover:shadow-md transition-all cursor-pointer ${statusFilter === key ? `ring-2 ${ring}` : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 검색 + 필터 */}
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
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
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

      {/* 일괄 작업 바 */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Badge variant="default">{selectedIds.size}건 선택됨</Badge>
                {selectedUnsubmitted.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    (미제출 {selectedUnsubmitted.length}건)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedUnsubmitted.length > 0 && (
                  <Button size="sm" onClick={handleBulkSubmit} disabled={isBulkSubmitting}>
                    {isBulkSubmitting
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <ClipboardCheck className="h-4 w-4 mr-2" />}
                    일괄 제출 처리 ({selectedUnsubmitted.length})
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={isBulkSubmitting}>
                  선택 해제
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 숙제 목록 */}
      <section aria-label="숙제 목록">
        <Card>
          <CardContent className="pt-6">
            {filteredHomeworks.length === 0 ? (
              <EmptyState
                icon={searchTerm ? Search : BookCopy}
                title={searchTerm ? '검색 결과가 없습니다' : '숙제가 없습니다'}
                description={searchTerm ? '다른 검색어를 입력해보세요' : '새로운 숙제를 출제하여 시작하세요'}
                action={
                  !searchTerm && (
                    <Button asChild>
                      <Link href="/homeworks/new">
                        <Plus className="h-4 w-4 mr-2" />
                        숙제 출제
                      </Link>
                    </Button>
                  )
                }
              />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={toggleAll}
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead>상태</TableHead>
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
                      <TableRow
                        key={homework.id}
                        className={selectedIds.has(homework.id) ? 'bg-muted/30' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(homework.id)}
                            onCheckedChange={() => toggleOne(homework.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="행 선택"
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(homework)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{homework.title}</div>
                            {homework.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{homework.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">{homework.students?.user_id?.name ?? 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{homework.students?.student_code ?? '-'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {homework.subject
                            ? <Badge variant="outline">{homework.subject}</Badge>
                            : <span className="text-sm text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[homework.priority as keyof typeof priorityColors]}>
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
                          <div className="flex items-center justify-end gap-2">
                            {homework.graded_at && homework.score !== null && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span>{homework.score}점</span>
                              </div>
                            )}
                            {!homework.submitted_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitSingle(homework.id)}
                                disabled={submittingId === homework.id}
                              >
                                {submittingId === homework.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <ClipboardCheck className="h-3 w-3 mr-1" />}
                                제출 처리
                              </Button>
                            )}
                            {homework.submitted_at && (
                              <Button
                                size="sm"
                                variant={homework.graded_at ? 'outline' : 'default'}
                                onClick={() => setGradeTarget(homework)}
                              >
                                {homework.graded_at ? '재채점' : '채점'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendNotificationClick(homework)}
                              disabled={isSendingNotification}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              부모님께 발송
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(homework.id, homework.title)}
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

      {/* 채점 다이얼로그 */}
      {gradeDialogData && (
        <GradeDialog
          open={gradeTarget !== null}
          onOpenChange={(open) => { if (!open) setGradeTarget(null) }}
          submission={gradeDialogData}
          onGradeComplete={() => {
            setGradeTarget(null)
            window.location.reload()
          }}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
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

      {/* 부모님께 발송 확인 다이얼로그 */}
      <ConfirmationDialog
        open={notifyDialogOpen}
        onOpenChange={setNotifyDialogOpen}
        title="부모님께 숙제 안내 발송"
        description={
          itemToNotify
            ? `"${itemToNotify.title}" 숙제 안내를 ${itemToNotify.studentName} 학생의 보호자에게 발송하시겠습니까?`
            : ''
        }
        confirmText="발송"
        variant="default"
        isLoading={isSendingNotification}
        onConfirm={handleConfirmSendNotification}
      />
    </div>
  )
}
