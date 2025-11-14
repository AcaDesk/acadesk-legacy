'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Label } from '@ui/label'
import { Separator } from '@ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  Edit,
  PenSquare,
  Users,
  Calendar,
  BookOpen,
  FileText,
  UserPlus,
  Trash2,
  Tag,
  Repeat,
  Search,
  X,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { AssignStudentsDialog } from '@/components/features/exams/assign-students-dialog'
import { createClient } from '@/lib/supabase/client'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState } from '@ui/empty-state'

interface Exam {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  exam_date: string | null
  class_id: string | null
  total_questions: number | null
  passing_score: number | null
  description: string | null
  is_recurring: boolean | null
  recurring_schedule: string | null
  created_at: string
  classes?: {
    id: string
    name: string
  }[] | null
}

interface Student {
  id: string
  student_code: string
  name: string
  grade: string | null
}

interface ScoreData {
  student_id: string
  score: number | null
  total_points: number | null
  percentage: number | null
}

type StatusFilter = 'all' | 'entered' | 'not-entered'

interface ExamDetailClientProps {
  exam: Exam
}

export function ExamDetailClient({ exam }: ExamDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Map<string, ScoreData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<{
    id: string
    name: string
    hasScore: boolean
    scoreData?: ScoreData
  } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Get unique grades from students
  const availableGrades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort()
  }, [students])

  // Filter students based on grade, status, and search
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Grade filter
      if (gradeFilter !== 'all' && student.grade !== gradeFilter) {
        return false
      }

      // Status filter (성적 입력 여부)
      const score = scores.get(student.id)
      const hasScore = score && score.score !== null && score.total_points !== null

      if (statusFilter === 'entered' && !hasScore) {
        return false
      }
      if (statusFilter === 'not-entered' && hasScore) {
        return false
      }

      // Search filter
      if (searchTerm.trim()) {
        const name = student.name?.toLowerCase() || ''
        const code = student.student_code?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return name.includes(search) || code.includes(search)
      }

      return true
    })
  }, [students, scores, gradeFilter, statusFilter, searchTerm])

  // Calculate score statistics
  const totalAssigned = students.length
  const enteredCount = useMemo(() => {
    return Array.from(scores.values()).filter(
      (s) => s.score !== null && s.total_points !== null
    ).length
  }, [scores])

  const notEnteredCount = totalAssigned - enteredCount
  const hasAnyScore = enteredCount > 0
  const hasQuestions = typeof exam.total_questions === 'number' && exam.total_questions > 0

  const averagePercentage = useMemo(() => {
    if (enteredCount === 0) return 0
    const scoresWithPercentage = Array.from(scores.values()).filter(
      (s) => s.percentage !== null
    )
    if (scoresWithPercentage.length === 0) return 0
    const sum = scoresWithPercentage.reduce((acc, s) => acc + (s.percentage || 0), 0)
    return Math.round(sum / scoresWithPercentage.length)
  }, [scores, enteredCount])

  const progressLabel =
    totalAssigned === 0
      ? '학생 미배정'
      : enteredCount === 0
      ? '성적 미입력'
      : enteredCount === totalAssigned
      ? '성적 입력 완료'
      : `성적 입력 중 (${enteredCount}/${totalAssigned})`

  const passingLabel = exam.passing_score
    ? `${exam.passing_score}점 이상`
    : '미설정 (기본 70점 사용)'

  function getExamTypeLabel(type: string | null) {
    if (!type) return '미선택'
    const typeMap: Record<string, string> = {
      vocabulary: '단어시험',
      midterm: '중간고사',
      final: '기말고사',
      quiz: '퀴즈',
      mock: '모의고사',
      assignment: '과제',
    }
    return typeMap[type] || type
  }

  function getRecurringScheduleLabel(schedule: string | null) {
    if (!schedule) return '-'
    const scheduleMap: Record<string, string> = {
      daily: '매일',
      weekly_mon_wed_fri: '매주 월수금',
      weekly_tue_thu: '매주 화목',
      weekly: '매주 (같은 요일)',
      biweekly: '격주',
      monthly: '매월',
    }
    return scheduleMap[schedule] || schedule
  }

  function getScoreStatus(percentage: number | null) {
    if (percentage === null) {
      return {
        label: '미입력',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        badgeVariant: 'secondary' as const,
      }
    }

    if (percentage >= 90) {
      return {
        label: '우수',
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        badgeVariant: 'default' as const,
      }
    }

    if (percentage >= 70) {
      return {
        label: '합격',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        badgeVariant: 'default' as const,
      }
    }

    return {
      label: '미달',
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      badgeVariant: 'destructive' as const,
    }
  }

  useEffect(() => {
    if (currentUser && currentUser.tenantId) {
      loadStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, currentUser])

  async function loadStudents() {
    if (!currentUser || !currentUser.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Get students who have scores for this exam
      const { data: scoreRecords, error } = await supabase
        .from('exam_scores')
        .select(`
          student_id,
          score,
          total_points,
          percentage,
          students (
            id,
            student_code,
            users!user_id (name),
            grade
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', exam.id)

      if (error) throw error

      const studentList: Student[] = []
      const scoreMap = new Map<string, ScoreData>()

      ;(scoreRecords || []).forEach((record: any) => {
        if (record.students) {
          studentList.push({
            id: record.students.id,
            student_code: record.students.student_code,
            name: record.students.users?.name || '이름 없음',
            grade: record.students.grade,
          })

          scoreMap.set(record.student_id, {
            student_id: record.student_id,
            score: record.score,
            total_points: record.total_points,
            percentage: record.percentage,
          })
        }
      })

      setStudents(studentList)
      setScores(scoreMap)
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleRemoveClick(studentId: string, studentName: string) {
    const score = scores.get(studentId)
    const hasScore = score && score.score !== null && score.total_points !== null

    setStudentToRemove({
      id: studentId,
      name: studentName,
      hasScore: !!hasScore,
      scoreData: hasScore ? score : undefined,
    })
    setDeleteDialogOpen(true)
  }

  async function handleUndo(removedData: {
    id: string
    name: string
    scoreData?: ScoreData
  }) {
    if (!currentUser || !currentUser.tenantId) return

    // Clear any existing undo timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId)
      setUndoTimeoutId(null)
    }

    try {
      // Restore the student score record
      const { error } = await supabase.from('exam_scores').insert({
        tenant_id: currentUser.tenantId,
        exam_id: exam.id,
        student_id: removedData.id,
        score: removedData.scoreData?.score || null,
        total_points: removedData.scoreData?.total_points || null,
        percentage: removedData.scoreData?.percentage || null,
      })

      if (error) throw error

      toast({
        title: '복구 완료',
        description: `${removedData.name} 학생이 복구되었습니다.`,
      })

      loadStudents()
    } catch (error) {
      console.error('Error undoing removal:', error)
      toast({
        title: '복구 오류',
        description: '학생을 복구하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleConfirmRemove() {
    if (!currentUser || !currentUser.tenantId || !studentToRemove) return

    const removedData = { ...studentToRemove }
    setIsRemoving(true)

    try {
      const { error } = await supabase
        .from('exam_scores')
        .delete()
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', exam.id)
        .eq('student_id', studentToRemove.id)

      if (error) throw error

      // Show toast with undo button
      const { dismiss } = toast({
        title: '제외 완료',
        description: `${studentToRemove.name} 학생이 시험에서 제외되었습니다.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismiss()
              handleUndo(removedData)
            }}
          >
            되돌리기
          </Button>
        ),
      })

      // Set timeout to prevent undo after 10 seconds
      const timeoutId = setTimeout(() => {
        setUndoTimeoutId(null)
      }, 10000)
      setUndoTimeoutId(timeoutId)

      loadStudents()
    } catch (error) {
      console.error('Error removing student:', error)
      toast({
        title: '제외 오류',
        description: '학생을 제외하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
      setDeleteDialogOpen(false)
      setStudentToRemove(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{exam.name}</h1>
          <p className="text-muted-foreground mt-1">{exam.description || '시험 정보 및 학생 배정'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/grades/exams/${exam.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            시험 수정
          </Button>
          <Button
            onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
          >
            <PenSquare className="h-4 w-4 mr-2" />
            성적 입력
          </Button>
        </div>
      </div>

      {/* Exam Info Cards - Grouped */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 기본 정보 그룹 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">기본 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>시험 유형</span>
              </div>
              <span className="font-medium">{getExamTypeLabel(exam.exam_type)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>시험일</span>
              </div>
              <span className="font-medium">
                {exam.exam_date
                  ? new Date(exam.exam_date).toLocaleDateString('ko-KR')
                  : '미정'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>수업</span>
              </div>
              <span className="font-medium">{exam.classes?.[0]?.name || '미배정'}</span>
            </div>
            {exam.is_recurring && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Repeat className="h-4 w-4" />
                  <span>반복 주기</span>
                </div>
                <span className="font-medium">{getRecurringScheduleLabel(exam.recurring_schedule)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 성적 관련 정보 그룹 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">성적 관련 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>문항 수</span>
              </div>
              <span className="font-medium text-lg">{exam.total_questions || '-'}문항</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>배정 인원</span>
              </div>
              <span className="font-medium text-lg text-primary">{students.length}명</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>배정된 학생</CardTitle>
                <CardDescription>
                  이 시험에 배정된 학생들입니다. 성적 입력 시 이 학생들만 표시됩니다.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  학생 배정
                </Button>
                {students.length > 0 && (
                  <Button onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}>
                    <PenSquare className="h-4 w-4 mr-2" />
                    성적 입력
                  </Button>
                )}
              </div>
            </div>
            {students.length > 0 && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  {availableGrades.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="gradeFilter" className="text-sm whitespace-nowrap">
                          학년:
                        </Label>
                        <Select value={gradeFilter} onValueChange={setGradeFilter}>
                          <SelectTrigger id="gradeFilter" className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            {availableGrades.map((grade) => (
                              <SelectItem key={grade} value={grade as string}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator orientation="vertical" className="h-6" />
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <Label htmlFor="statusFilter" className="text-sm whitespace-nowrap">
                      성적 입력:
                    </Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                      <SelectTrigger id="statusFilter" className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="entered">입력 완료</SelectItem>
                        <SelectItem value="not-entered">미입력</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search & Count */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="학생 이름, 학번으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
                    {filteredStudents.length}명
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="배정된 학생이 없습니다"
              description="시험 생성 후 학생을 배정해 주세요. 학생을 배정하면 성적 입력이 가능합니다."
              action={
                <Button onClick={() => setShowAssignDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  학생 배정하기
                </Button>
              }
            />
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[560px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">학생</TableHead>
                    <TableHead className="w-[120px]">학번</TableHead>
                    <TableHead className="w-[80px] text-center">학년</TableHead>
                    <TableHead className="w-[100px] text-center hidden md:table-cell">맞은/전체</TableHead>
                    <TableHead className="w-[100px] text-center">득점률</TableHead>
                    <TableHead className="w-[100px] text-center">상태</TableHead>
                    <TableHead className="w-[60px] text-center">제거</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const score = scores.get(student.id)
                    const hasScore = score && score.score !== null && score.total_points !== null
                    const scoreStatus = getScoreStatus(hasScore ? score.percentage : null)

                    return (
                      <TableRow key={student.id} className="hover:bg-muted/50">
                        {/* 학생 이름 */}
                        <TableCell className="font-medium">{student.name}</TableCell>

                        {/* 학번 */}
                        <TableCell className="text-muted-foreground">{student.student_code}</TableCell>

                        {/* 학년 */}
                        <TableCell className="text-center">
                          {student.grade ? (
                            <Badge variant="outline" className="text-xs">
                              {student.grade}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        {/* 맞은 개수/전체 (모바일에서는 숨김) */}
                        <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                          {hasScore ? `${score.score}/${score.total_points}` : '-'}
                        </TableCell>

                        {/* 득점률 */}
                        <TableCell className="text-center">
                          {hasScore ? (
                            <div className={`inline-block px-3 py-1 rounded-md font-semibold text-sm ${scoreStatus.color}`}>
                              {score.percentage}%
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>

                        {/* 상태 */}
                        <TableCell className="text-center">
                          <Badge variant={scoreStatus.badgeVariant} className="text-xs">
                            {scoreStatus.label}
                          </Badge>
                        </TableCell>

                        {/* 제거 버튼 */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveClick(student.id, student.name)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Steps Guide */}
      {students.length > 0 && (
        <Card className="border-primary bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-8">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-green-700">시험 생성 완료</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-green-700">
                    학생 배정 완료 ({students.length}명)
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 animate-pulse" />
                  <span className="font-semibold text-primary">
                    다음 단계: 성적 입력하기
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
                className="flex-shrink-0"
              >
                <PenSquare className="h-5 w-5 mr-2" />
                성적 입력 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Students Dialog */}
      <AssignStudentsDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        examId={exam.id}
        classId={exam.class_id}
        onSuccess={() => {
          loadStudents()
          setShowAssignDialog(false)
        }}
      />

      {/* Remove Student Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="학생을 시험에서 제외하시겠습니까?"
        description={
          studentToRemove ? (
            <div className="space-y-2">
              <p>"{studentToRemove.name}" 학생을 시험에서 제외합니다.</p>
              {studentToRemove.hasScore && studentToRemove.scoreData && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                    ⚠️ 입력된 성적도 함께 삭제됩니다
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    득점률: {studentToRemove.scoreData.percentage}% ({studentToRemove.scoreData.score}/{studentToRemove.scoreData.total_points})
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                제외 후 10초 이내에 "되돌리기" 버튼으로 복구할 수 있습니다.
              </p>
            </div>
          ) : ''
        }
        confirmText="제외"
        variant="destructive"
        isLoading={isRemoving}
        onConfirm={handleConfirmRemove}
      />
    </div>
  )
}
