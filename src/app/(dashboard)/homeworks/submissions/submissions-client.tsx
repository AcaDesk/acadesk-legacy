'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { Checkbox } from '@ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  CheckCircle2,
  Circle,
  XCircle,
  Search,
  Calendar,
  User,
  Star,
  BookCopy,
  Loader2,
  ClipboardCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { submitHomework } from '@/app/actions/homeworks'
import { GradeDialog } from './grade-dialog'

interface HomeworkWithSubmission {
  id: string
  tenant_id: string
  student_id: string
  title: string
  description: string | null
  subject: string | null
  priority: string
  due_date: string
  completed_at: string | null
  verified_at: string | null
  submission_id: string | null
  submitted_at: string | null
  graded_at: string | null
  score: number | null
  feedback: string | null
  text_answer: string | null
  attachment_urls: string[] | null
  student_name: string
  student_code: string
}

interface SubmissionsClientProps {
  initialHomeworks: HomeworkWithSubmission[]
}

interface GroupedHomework {
  title: string
  subject: string | null
  dueDate: string
  priority: string
  submissions: HomeworkWithSubmission[]
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

export function SubmissionsClient({ initialHomeworks }: SubmissionsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkWithSubmission | null>(null)
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const { toast } = useToast()

  const groupedHomeworks = useMemo(() => {
    const groups = new Map<string, GroupedHomework>()
    initialHomeworks.forEach((hw) => {
      const key = `${hw.title}-${hw.due_date}`
      if (!groups.has(key)) {
        groups.set(key, { title: hw.title, subject: hw.subject, dueDate: hw.due_date, priority: hw.priority, submissions: [] })
      }
      groups.get(key)!.submissions.push(hw)
    })
    return Array.from(groups.values())
  }, [initialHomeworks])

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedHomeworks
    const search = searchTerm.toLowerCase()
    return groupedHomeworks.filter(
      (group) =>
        group.title.toLowerCase().includes(search) ||
        group.subject?.toLowerCase().includes(search) ||
        group.submissions.some(
          (s) =>
            s.student_name.toLowerCase().includes(search) ||
            s.student_code.toLowerCase().includes(search)
        )
    )
  }, [groupedHomeworks, searchTerm])

  const stats = useMemo(() => {
    const total = initialHomeworks.length
    const submitted = initialHomeworks.filter((h) => h.submitted_at).length
    const graded = initialHomeworks.filter((h) => h.graded_at).length
    return {
      total,
      submitted,
      graded,
      pending: total - submitted,
      submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      gradingRate: total > 0 ? Math.round((graded / total) * 100) : 0,
    }
  }, [initialHomeworks])

  // 현재 화면에 보이는 모든 제출 ID
  const allVisibleIds = useMemo(
    () => filteredGroups.flatMap((g) => g.submissions.map((s) => s.id)),
    [filteredGroups]
  )

  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id))
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id)) && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allVisibleIds))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // 선택된 항목 중 미제출인 것만
  const selectedUnsubmitted = useMemo(
    () => initialHomeworks.filter((h) => selectedIds.has(h.id) && !h.submitted_at),
    [initialHomeworks, selectedIds]
  )

  async function handleSubmitSingle(taskId: string) {
    setSubmittingId(taskId)
    try {
      const result = await submitHomework({ taskId })
      if (result.success) {
        toast({ title: '제출 처리 완료' })
        window.location.reload()
      } else {
        toast({ title: '제출 오류', description: result.error ?? undefined, variant: 'destructive' })
      }
    } catch {
      toast({ title: '제출 오류', description: '처리 중 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleBulkSubmit() {
    if (selectedUnsubmitted.length === 0) return
    setIsBulkSubmitting(true)
    try {
      const results = await Promise.allSettled(
        selectedUnsubmitted.map((h) => submitHomework({ taskId: h.id }))
      )
      const succeeded = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length
      const failed = results.length - succeeded

      if (failed === 0) {
        toast({ title: `${succeeded}건 제출 처리 완료` })
      } else {
        toast({
          title: `처리 완료`,
          description: `${succeeded}건 성공, ${failed}건 실패`,
          variant: failed > 0 ? 'destructive' : 'default',
        })
      }
      setSelectedIds(new Set())
      window.location.reload()
    } catch {
      toast({ title: '일괄 처리 오류', description: '처리 중 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  function handleGrade(submission: HomeworkWithSubmission) {
    setSelectedSubmission(submission)
    setGradeDialogOpen(true)
  }

  function handleGradeComplete() {
    setGradeDialogOpen(false)
    setSelectedSubmission(null)
    window.location.reload()
  }

  function getStatusIcon(submission: HomeworkWithSubmission) {
    if (submission.graded_at) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (submission.submitted_at) return <CheckCircle2 className="h-5 w-5 text-info" />
    if (new Date(submission.due_date) < new Date()) return <XCircle className="h-5 w-5 text-red-600" />
    return <Circle className="h-5 w-5 text-muted-foreground" />
  }

  function getStatusBadge(submission: HomeworkWithSubmission) {
    if (submission.graded_at) return <Badge variant="outline" className="bg-green-50">채점 완료</Badge>
    if (submission.submitted_at) return <Badge variant="outline" className="bg-info/10">제출 완료</Badge>
    if (new Date(submission.due_date) < new Date()) return <Badge variant="destructive">미제출 (기한초과)</Badge>
    return <Badge variant="secondary">미제출</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 숙제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">출제된 총 숙제</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">제출률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.submissionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.submitted} / {stats.total} 제출</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">채점률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.gradingRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.graded} / {stats.total} 채점</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">미제출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">제출 대기 중</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + 전체선택 */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="숙제 제목, 과목, 학생 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAll}
              disabled={allVisibleIds.length === 0}
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer select-none">
              전체 선택 ({allVisibleIds.length}건)
            </label>
          </div>
        </CardContent>
      </Card>

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
                  <Button
                    size="sm"
                    onClick={handleBulkSubmit}
                    disabled={isBulkSubmitting}
                  >
                    {isBulkSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                    )}
                    일괄 제출 처리 ({selectedUnsubmitted.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={isBulkSubmitting}
                >
                  선택 해제
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Homework List */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookCopy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? '검색 결과가 없습니다' : '출제된 숙제가 없습니다'}</p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {group.title}
                      {group.subject && <Badge variant="outline">{group.subject}</Badge>}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        마감: {new Date(group.dueDate).toLocaleDateString('ko-KR')}
                      </span>
                      <Badge className={priorityColors[group.priority as keyof typeof priorityColors]}>
                        {priorityLabels[group.priority as keyof typeof priorityLabels]}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {group.submissions.filter((s) => s.submitted_at).length} / {group.submissions.length} 제출
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              group.submissions.every((s) => selectedIds.has(s.id))
                                ? true
                                : group.submissions.some((s) => selectedIds.has(s.id))
                                ? 'indeterminate'
                                : false
                            }
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedIds)
                              group.submissions.forEach((s) => {
                                if (checked) next.add(s.id)
                                else next.delete(s.id)
                              })
                              setSelectedIds(next)
                            }}
                            aria-label="그룹 전체 선택"
                          />
                        </TableHead>
                        <TableHead className="w-[50px]">상태</TableHead>
                        <TableHead>학생</TableHead>
                        <TableHead>제출일</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.submissions.map((submission) => (
                        <TableRow
                          key={submission.id}
                          className={selectedIds.has(submission.id) ? 'bg-muted/30' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(submission.id)}
                              onCheckedChange={() => toggleOne(submission.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="행 선택"
                            />
                          </TableCell>
                          <TableCell>{getStatusIcon(submission)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">{submission.student_name}</div>
                                <div className="text-xs text-muted-foreground">{submission.student_code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {submission.submitted_at ? (
                              <div className="text-sm">
                                {new Date(submission.submitted_at).toLocaleString('ko-KR')}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.score !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{submission.score}점</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {getStatusBadge(submission)}
                              {!submission.submitted_at && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSubmitSingle(submission.id)}
                                  disabled={submittingId === submission.id}
                                >
                                  {submittingId === submission.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ClipboardCheck className="h-4 w-4 mr-1" />
                                  )}
                                  제출 처리
                                </Button>
                              )}
                              {submission.submitted_at && (
                                <Button
                                  size="sm"
                                  variant={submission.graded_at ? 'outline' : 'default'}
                                  onClick={() => handleGrade(submission)}
                                >
                                  {submission.graded_at ? '재채점' : '채점'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Grade Dialog */}
      {selectedSubmission && (
        <GradeDialog
          open={gradeDialogOpen}
          onOpenChange={setGradeDialogOpen}
          submission={selectedSubmission}
          onGradeComplete={handleGradeComplete}
        />
      )}
    </div>
  )
}
