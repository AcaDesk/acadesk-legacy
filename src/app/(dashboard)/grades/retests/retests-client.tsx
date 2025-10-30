'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  getRetestStudents,
  waiveRetest,
  postponeRetest,
  createRetestExam,
  type RetestStudent,
} from '@/app/actions/retests'
import { Loader2, MoreVertical, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export function RetestsClient() {
  const router = useRouter()
  const { toast } = useToast()

  const [students, setStudents] = useState<RetestStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Confirmation dialogs
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false)
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false)
  const [createRetestDialogOpen, setCreateRetestDialogOpen] = useState(false)
  const [targetStudent, setTargetStudent] = useState<RetestStudent | null>(null)

  // Load students
  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    try {
      setLoading(true)
      const result = await getRetestStudents()

      if (result.success && result.data) {
        setStudents(result.data)
      } else {
        throw new Error(result.error || '재시험 대상 학생을 불러올 수 없습니다')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '로드 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setLoading(false)
    }
  }

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

  // Select all / deselect all
  function toggleAll() {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map((s) => s.exam_score_id)))
    }
  }

  // Handle waive retest
  async function handleWaiveRetest() {
    if (!targetStudent) return

    setActionLoading('waive')
    try {
      const result = await waiveRetest(targetStudent.exam_score_id)

      if (!result.success) {
        throw new Error(result.error || '재시험 면제 실패')
      }

      toast({
        title: '재시험 면제 완료',
        description: `${targetStudent.student_name} 학생의 재시험이 면제되었습니다.`,
      })

      await loadStudents()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '재시험 면제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setActionLoading(null)
      setWaiveDialogOpen(false)
      setTargetStudent(null)
    }
  }

  // Handle postpone retest
  async function handlePostponeRetest() {
    if (!targetStudent) return

    setActionLoading('postpone')
    try {
      const result = await postponeRetest(targetStudent.exam_score_id)

      if (!result.success) {
        throw new Error(result.error || '재시험 연기 실패')
      }

      toast({
        title: '재시험 연기 완료',
        description: `${targetStudent.student_name} 학생의 재시험이 연기되었습니다.`,
      })

      await loadStudents()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '재시험 연기 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setActionLoading(null)
      setPostponeDialogOpen(false)
      setTargetStudent(null)
    }
  }

  // Handle create retest exam for selected students
  async function handleCreateRetest() {
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

    setActionLoading('create')
    try {
      const examId = uniqueExamIds[0]
      const studentIds = selectedStudentData.map((s) => s.student_id)

      const result = await createRetestExam(examId, studentIds)

      if (!result.success || !result.data) {
        throw new Error(result.error || '재시험 생성 실패')
      }

      toast({
        title: '재시험 생성 완료',
        description: `${selectedStudents.size}명의 학생이 재시험에 배정되었습니다.`,
      })

      // Navigate to the new retest exam
      router.push(`/grades/exams/${result.data.retestExamId}`)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '재시험 생성 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    } finally {
      setActionLoading(null)
      setCreateRetestDialogOpen(false)
      setSelectedStudents(new Set())
    }
  }

  // Group students by exam
  const groupedStudents = students.reduce((acc, student) => {
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
  }, {} as Record<string, { exam_name: string; exam_date: string; passing_score: number; students: RetestStudent[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium mb-2">재시험 대상 학생이 없습니다</p>
            <p className="text-muted-foreground">모든 학생이 합격했거나 재시험이 처리되었습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      {selectedStudents.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedStudents.size}명의 학생 선택됨
              </p>
              <Button onClick={() => setCreateRetestDialogOpen(true)}>
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

      {/* Create Retest Confirmation Dialog */}
      <ConfirmationDialog
        open={createRetestDialogOpen}
        onOpenChange={setCreateRetestDialogOpen}
        title="재시험을 생성하시겠습니까?"
        description={`선택된 ${selectedStudents.size}명의 학생을 재시험에 배정합니다.`}
        confirmText="생성 및 배정"
        variant="default"
        isLoading={actionLoading === 'create'}
        onConfirm={handleCreateRetest}
      />
    </div>
  )
}
