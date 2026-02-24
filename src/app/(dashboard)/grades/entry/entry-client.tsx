'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { Skeleton } from '@ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  PenSquare,
  CheckCircle2,
  Clock,
  BarChart3,
  Users,
  RotateCcw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getExamsForGradeEntry } from '@/app/actions/grades/grade-entry'
import { completeExamGrading, reopenExamGrading } from '@/app/actions/grades/exams'
import type { ExamForGradeEntry } from '@/app/actions/grades/grade-entry'

interface EntryClientProps {
  initialExams: ExamForGradeEntry[]
}

type GradeEntryPeriod = 'this_month' | 'last_15_days' | 'last_3_months' | 'all'

const periodLabel: Record<GradeEntryPeriod, string> = {
  this_month: '이번 달',
  last_15_days: '최근 15일',
  last_3_months: '최근 3개월',
  all: '전체',
}

export function EntryClient({ initialExams }: EntryClientProps) {
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState('pending')

  // Pending tab data
  const [pendingExams, setPendingExams] = useState<ExamForGradeEntry[]>(initialExams)
  const [pendingLoading, setPendingLoading] = useState(false)

  // Completed tab data
  const [completedExams, setCompletedExams] = useState<ExamForGradeEntry[]>([])
  const [completedLoading, setCompletedLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<GradeEntryPeriod>('this_month')
  const completedCacheRef = useRef<Record<string, ExamForGradeEntry[]>>({})
  const pendingRequestSeqRef = useRef(0)
  const completedRequestSeqRef = useRef(0)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    examId: string
    examName: string
    pendingCount: number
    action: 'complete' | 'reopen'
  }>({ open: false, examId: '', examName: '', pendingCount: 0, action: 'complete' })
  const [isConfirming, setIsConfirming] = useState(false)

  // Group pending exams
  const groupedPending = useMemo(() => {
    const notStarted = pendingExams.filter((e) => e.graded_students === 0)
    const inProgress = pendingExams.filter((e) => e.graded_students > 0)
    return { notStarted, inProgress }
  }, [pendingExams])

  // Completed tab stats
  const completedStats = useMemo(() => {
    const count = completedExams.length
    const scores = completedExams
      .map((e) => e.average_score)
      .filter((s): s is number => s !== null)
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null
    return { count, avgScore }
  }, [completedExams])

  // Load pending exams
  async function loadPendingExams() {
    const requestSeq = ++pendingRequestSeqRef.current
    setPendingLoading(true)
    try {
      const result = await getExamsForGradeEntry({ completed: false, period: selectedPeriod })
      if (requestSeq !== pendingRequestSeqRef.current) return
      if (result.success && result.data) {
        setPendingExams(result.data)
      }
    } finally {
      if (requestSeq === pendingRequestSeqRef.current) {
        setPendingLoading(false)
      }
    }
  }

  // Load completed exams for selected month
  async function loadCompletedExams(period: GradeEntryPeriod, options: { force?: boolean } = {}) {
    if (!options.force && completedCacheRef.current[period]) {
      setCompletedExams(completedCacheRef.current[period])
      return
    }

    const requestSeq = ++completedRequestSeqRef.current
    setCompletedLoading(true)
    try {
      const result = await getExamsForGradeEntry({ completed: true, period })
      if (requestSeq !== completedRequestSeqRef.current) return
      if (result.success && result.data) {
        completedCacheRef.current[period] = result.data
        setCompletedExams(result.data)
      }
    } finally {
      if (requestSeq === completedRequestSeqRef.current) {
        setCompletedLoading(false)
      }
    }
  }

  // Tab change handler
  function handleTabChange(value: string) {
    setActiveTab(value)
    if (value === 'completed') {
      loadCompletedExams(selectedPeriod)
    }
  }

  async function handlePeriodChange(value: GradeEntryPeriod) {
    setSelectedPeriod(value)
    const requestSeq = ++pendingRequestSeqRef.current
    setPendingLoading(true)
    try {
      const pendingResult = await getExamsForGradeEntry({ completed: false, period: value })
      if (requestSeq !== pendingRequestSeqRef.current) return
      if (pendingResult.success && pendingResult.data) {
        setPendingExams(pendingResult.data)
      }
    } finally {
      if (requestSeq === pendingRequestSeqRef.current) {
        setPendingLoading(false)
      }
    }

    if (activeTab === 'completed') {
      loadCompletedExams(value)
    } else {
      setCompletedExams(completedCacheRef.current[value] || [])
    }
  }

  // Complete exam grading
  function openCompleteDialog(exam: ExamForGradeEntry) {
    setConfirmDialog({
      open: true,
      examId: exam.id,
      examName: exam.name,
      pendingCount: exam.pending_students,
      action: 'complete',
    })
  }

  // Reopen exam grading
  function openReopenDialog(exam: ExamForGradeEntry) {
    setConfirmDialog({
      open: true,
      examId: exam.id,
      examName: exam.name,
      pendingCount: 0,
      action: 'reopen',
    })
  }

  async function handleConfirm() {
    setIsConfirming(true)
    try {
      if (confirmDialog.action === 'complete') {
        const result = await completeExamGrading(confirmDialog.examId)
        if (result.success) {
          toast({ title: '완료 처리되었습니다' })
          loadPendingExams()
          completedCacheRef.current = {}
          if (activeTab === 'completed') {
            loadCompletedExams(selectedPeriod, { force: true })
          }
        } else {
          toast({ title: result.error || '오류가 발생했습니다', variant: 'destructive' })
        }
      } else {
        const result = await reopenExamGrading(confirmDialog.examId)
        if (result.success) {
          toast({ title: '입력 필요 상태로 변경되었습니다' })
          delete completedCacheRef.current[selectedPeriod]
          loadCompletedExams(selectedPeriod, { force: true })
          // Also refresh pending if user switches back
          loadPendingExams()
        } else {
          toast({ title: result.error || '오류가 발생했습니다', variant: 'destructive' })
        }
      }
    } finally {
      setIsConfirming(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  function getProgressPercentage(exam: ExamForGradeEntry) {
    if (exam.total_students === 0) return 0
    return Math.round((exam.graded_students / exam.total_students) * 100)
  }

  function renderExamRow(exam: ExamForGradeEntry, mode: 'pending' | 'completed') {
    const progress = getProgressPercentage(exam)
    return (
      <TableRow key={exam.id}>
        <TableCell>
          <div className="font-medium">{exam.name}</div>
          {exam.classes && (
            <div className="text-xs text-muted-foreground">{exam.classes.name}</div>
          )}
        </TableCell>
        <TableCell>
          {exam.subject ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: exam.subject.color || '#gray' }}
              />
              <span className="text-sm">{exam.subject.name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {exam.exam_date
            ? new Date(exam.exam_date).toLocaleDateString('ko-KR')
            : '-'}
        </TableCell>
        <TableCell className="text-center">{exam.total_questions || '-'}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            {exam.total_students}명
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="space-y-1.5 min-w-[140px] inline-block text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {exam.graded_students}/{exam.total_students}명
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </TableCell>
        <TableCell className="text-center">
          {exam.average_score !== null ? (
            <Badge variant={exam.average_score >= 70 ? 'default' : 'secondary'}>
              {exam.average_score}점
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {mode === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  성적 입력
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCompleteDialog(exam)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  완료 처리
                </Button>
              </>
            )}
            {mode === 'completed' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  성적 보기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReopenDialog(exam)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  완료 취소
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  function renderExamSection(
    exams: ExamForGradeEntry[],
    title: string,
    icon: React.ReactNode,
    emptyMessage: string,
    mode: 'pending' | 'completed'
  ) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            {exams.length > 0 && (
              <Badge variant="secondary">{exams.length}개</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시험명</TableHead>
                    <TableHead>과목</TableHead>
                    <TableHead>시험일</TableHead>
                    <TableHead className="text-center">문항 수</TableHead>
                    <TableHead className="text-center">응시 인원</TableHead>
                    <TableHead className="text-center">진행 상황</TableHead>
                    <TableHead className="text-center">평균 점수</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => renderExamRow(exam, mode))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderTableSkeleton() {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const allPendingEmpty = pendingExams.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">성적 입력</h1>
        <p className="text-muted-foreground">
          시험별로 성적을 입력하고 진행 상황을 확인하세요
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">입력 필요</TabsTrigger>
            <TabsTrigger value="completed">입력 완료</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">기간</span>
            <Select value={selectedPeriod} onValueChange={(v) => handlePeriodChange(v as GradeEntryPeriod)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">이번 달</SelectItem>
                <SelectItem value="last_15_days">최근 15일</SelectItem>
                <SelectItem value="last_3_months">최근 3개월</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── 입력 필요 탭 ── */}
        <TabsContent value="pending">
          {pendingLoading && pendingExams.length === 0 ? (
            renderTableSkeleton()
          ) : (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      미입력
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                      {groupedPending.notStarted.length}개
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      입력 중
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-info">
                      {groupedPending.inProgress.length}개
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Exam sections */}
              {allPendingEmpty ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        입력이 필요한 시험이 없습니다
                      </p>
                      <p className="text-muted-foreground mb-4">
                        모든 시험의 성적 입력이 완료되었거나, 등록된 시험이 없습니다
                      </p>
                      <Button onClick={() => router.push('/grades/exams/new')}>
                        시험 등록하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {renderExamSection(
                    groupedPending.notStarted,
                    '미입력 시험',
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-500" />,
                    '미입력 시험이 없습니다',
                    'pending'
                  )}
                  {renderExamSection(
                    groupedPending.inProgress,
                    '입력 중인 시험',
                    <BarChart3 className="w-5 h-5 text-info" />,
                    '입력 중인 시험이 없습니다',
                    'pending'
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── 입력 완료 탭 ── */}
        <TabsContent value="completed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {periodLabel[selectedPeriod]} 기준 완료 시험
              </p>
              {completedLoading && (
                <span className="text-sm text-muted-foreground">불러오는 중...</span>
              )}
            </div>

            {completedLoading && completedExams.length === 0 ? (
              renderTableSkeleton()
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        완료 시험
                      </CardDescription>
                      <CardTitle className="text-2xl font-bold text-success">
                        {completedStats.count}개
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        평균 점수
                      </CardDescription>
                      <CardTitle className="text-2xl font-bold">
                        {completedStats.avgScore !== null
                          ? `${completedStats.avgScore}점`
                          : '-'}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Completed exams table */}
                {renderExamSection(
                  completedExams,
                  '입력 완료된 시험',
                  <CheckCircle2 className="w-5 h-5 text-success" />,
                  '해당 월에 완료된 시험이 없습니다',
                  'completed'
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={
          confirmDialog.action === 'complete'
            ? `"${confirmDialog.examName}" 시험을 완료 처리하시겠습니까?`
            : `"${confirmDialog.examName}" 시험의 완료를 취소하시겠습니까?`
        }
        description={
          confirmDialog.action === 'complete' && confirmDialog.pendingCount > 0
            ? `아직 ${confirmDialog.pendingCount}명의 학생 성적이 미입력 상태입니다. 완료 처리하시겠습니까?`
            : confirmDialog.action === 'complete'
              ? '이 시험의 성적 입력을 완료로 표시합니다.'
              : '이 시험을 다시 "입력 필요" 상태로 되돌립니다.'
        }
        confirmText={confirmDialog.action === 'complete' ? '완료 처리' : '완료 취소'}
        variant={confirmDialog.action === 'complete' ? 'default' : 'destructive'}
        isLoading={isConfirming}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
