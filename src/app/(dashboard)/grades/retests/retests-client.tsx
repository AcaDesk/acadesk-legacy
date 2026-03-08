'use client'

import { useMemo, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Checkbox } from '@ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Label } from '@ui/label'
import { type RetestStudent } from '@/app/actions/grades/retests'
import { Loader2, MoreVertical, AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DatePicker } from '@ui/date-picker'
import { useRetestStudentsQuery } from '@/hooks/queries/use-retest-students-query'
import {
  useWaiveRetestMutation,
  usePostponeRetestMutation,
  useCreateRetestMutation,
} from '@/hooks/mutations/use-retest-mutations'

export function RetestsClient() {
  const { toast } = useToast()

  const { data: students = [], isLoading } = useRetestStudentsQuery()
  const waiveMutation = useWaiveRetestMutation()
  const postponeMutation = usePostponeRetestMutation()
  const createRetestMutation = useCreateRetestMutation()

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [targetStudent, setTargetStudent] = useState<RetestStudent | null>(null)

  // Confirmation dialogs
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false)
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false)
  const [createRetestDialogOpen, setCreateRetestDialogOpen] = useState(false)

  // Retest creation form
  const [retestDate, setRetestDate] = useState<Date | undefined>(undefined)
  const [originalExamName, setOriginalExamName] = useState('')

  // Toggle student selection
  function toggleStudent(examScoreId: string) {
    const newSet = new Set(selectedStudents)
    if (newSet.has(examScoreId)) {
      newSet.delete(examScoreId)
    } else {
      newSet.add(examScoreId)
    }
    setSelectedStudents(newSet)
  }

  function handleWaiveRetest() {
    if (!targetStudent) return
    waiveMutation.mutate(
      { examScoreId: targetStudent.exam_score_id, studentName: targetStudent.student_name },
      { onSettled: () => { setWaiveDialogOpen(false); setTargetStudent(null) } }
    )
  }

  function handlePostponeRetest() {
    if (!targetStudent) return
    postponeMutation.mutate(
      { examScoreId: targetStudent.exam_score_id, studentName: targetStudent.student_name },
      { onSettled: () => { setPostponeDialogOpen(false); setTargetStudent(null) } }
    )
  }

  // Open create retest dialog with validation
  function openCreateRetestDialog() {
    if (selectedStudents.size === 0) {
      toast({
        variant: 'destructive',
        title: '학생을 선택하세요',
        description: '재시험에 배정할 학생을 선택해주세요.',
      })
      return
    }

    // Get unique exam IDs from selected students
    const selectedStudentData = students.filter((s) =>
      selectedStudents.has(s.exam_score_id)
    )
    const uniqueExamIds = [...new Set(selectedStudentData.map((s) => s.exam_id))]

    if (uniqueExamIds.length > 1) {
      toast({
        variant: 'destructive',
        title: '다른 시험의 학생들이 선택되었습니다',
        description: '같은 시험의 학생들만 선택해주세요.',
      })
      return
    }

    // Get original exam info
    const firstStudent = selectedStudentData[0]
    setOriginalExamName(firstStudent.exam_name)

    // Set default retest date to today
    setRetestDate(new Date())

    setCreateRetestDialogOpen(true)
  }

  function handleCreateRetest() {
    if (!retestDate) {
      toast({ variant: 'destructive', title: '날짜를 선택하세요', description: '재시험 날짜를 선택해주세요.' })
      return
    }
    const selectedStudentData = students.filter((s) => selectedStudents.has(s.exam_score_id))
    const examId = selectedStudentData[0].exam_id
    const studentIds = selectedStudentData.map((s) => s.student_id)

    createRetestMutation.mutate(
      { examId, studentIds, retestDate: format(retestDate, 'yyyy-MM-dd'), selectedCount: selectedStudents.size },
      {
        onSettled: () => {
          setCreateRetestDialogOpen(false)
          setSelectedStudents(new Set())
          setRetestDate(undefined)
          setOriginalExamName('')
        },
      }
    )
  }

  // Group students by exam
  const groupedStudents = useMemo(() => students.reduce((acc, student) => {
    if (!acc[student.exam_id]) {
      acc[student.exam_id] = {
        exam_name: student.exam_name,
        exam_date: student.exam_date,
        passing_score: student.passing_score,
        students: [],
      }
    }
    acc[student.exam_id].students.push(student)
    return acc
  }, {} as Record<string, { exam_name: string; exam_date: string; passing_score: number; students: RetestStudent[] }>), [students])

  if (isLoading) {
    return <LoadingState variant="spinner" className="py-12" />
  }

  if (students.length === 0) {
    return (
      <EmptyState
        variant="card"
        icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
        title="재시험 대상 학생이 없습니다"
        description="모든 학생이 합격했거나 재시험이 처리되었습니다."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      {selectedStudents.size > 0 && (
        <Card className="bg-info/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedStudents.size}명의 학생 선택됨
              </p>
              <Button onClick={openCreateRetestDialog}>
                재시험 생성 및 배정
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped by Exam */}
      {Object.entries(groupedStudents).map(([examId, group]) => (
        <Card key={examId}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  {group.exam_name}
                </CardTitle>
                <CardDescription>
                  시험일: {format(new Date(group.exam_date), 'PPP', { locale: ko })} · 합격 점수:{' '}
                  {group.passing_score}%
                </CardDescription>
              </div>
              <Badge variant="destructive">{group.students.length}명</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={group.students.every((s) =>
                        selectedStudents.has(s.exam_score_id)
                      )}
                      onCheckedChange={() => {
                        const allSelected = group.students.every((s) =>
                          selectedStudents.has(s.exam_score_id)
                        )
                        const newSet = new Set(selectedStudents)
                        group.students.forEach((s) => {
                          if (allSelected) {
                            newSet.delete(s.exam_score_id)
                          } else {
                            newSet.add(s.exam_score_id)
                          }
                        })
                        setSelectedStudents(newSet)
                      }}
                    />
                  </TableHead>
                  <TableHead>학생</TableHead>
                  <TableHead className="text-center">점수</TableHead>
                  <TableHead className="text-center">재시험 횟수</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.students.map((student) => (
                  <TableRow key={student.exam_score_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.has(student.exam_score_id)}
                        onCheckedChange={() => toggleStudent(student.exam_score_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{student.student_code}</span>
                          {student.grade && <span>· {student.grade}</span>}
                          {student.class_name && <span>· {student.class_name}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">
                        {student.student_score.toFixed(1)}% (미달)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{student.retest_count}회</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        재시험 필요
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTargetStudent(student)
                              setWaiveDialogOpen(true)
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            재시험 면제
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTargetStudent(student)
                              setPostponeDialogOpen(true)
                            }}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            다른 날로 연기
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Waive Confirmation Dialog */}
      <ConfirmationDialog
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        title="재시험을 면제하시겠습니까?"
        description={
          targetStudent
            ? `${targetStudent.student_name} 학생의 재시험을 면제합니다. 경고 없이 처리됩니다.`
            : ''
        }
        confirmText="면제"
        variant="default"
        isLoading={actionLoading === 'waive'}
        onConfirm={handleWaiveRetest}
      />

      {/* Postpone Confirmation Dialog */}
      <ConfirmationDialog
        open={postponeDialogOpen}
        onOpenChange={setPostponeDialogOpen}
        title="재시험을 연기하시겠습니까?"
        description={
          targetStudent
            ? `${targetStudent.student_name} 학생의 재시험을 다른 날로 연기합니다.`
            : ''
        }
        confirmText="연기"
        variant="default"
        isLoading={actionLoading === 'postpone'}
        onConfirm={handlePostponeRetest}
      />

      {/* Create Retest Dialog */}
      <Dialog open={createRetestDialogOpen} onOpenChange={setCreateRetestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>재시험 생성 및 배정</DialogTitle>
            <DialogDescription>
              선택된 {selectedStudents.size}명의 학생을 재시험에 배정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Original Exam Info */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">원본 시험</p>
                  <p className="text-sm text-muted-foreground">{originalExamName}</p>
                </div>
              </div>
            </div>

            {/* Retest Date Input */}
            <div className="space-y-2">
              <Label htmlFor="retest-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                재시험 날짜
              </Label>
              <DatePicker
                id="retest-date"
                value={retestDate}
                onChange={setRetestDate}
                placeholder="재시험 날짜 선택"
              />
              <p className="text-xs text-muted-foreground">
                재시험을 실시할 날짜를 선택하세요. 나중에 변경할 수 있습니다.
              </p>
            </div>

            {/* Selected Students Count */}
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">배정될 학생 수</p>
              <p className="text-2xl font-bold text-primary">{selectedStudents.size}명</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateRetestDialogOpen(false)}
              disabled={actionLoading === 'create'}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateRetest}
              disabled={actionLoading === 'create' || !retestDate}
            >
              {actionLoading === 'create' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '생성 및 배정'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
