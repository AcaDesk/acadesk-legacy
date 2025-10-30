'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
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
  AlertCircle,
  Users,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExamForGradeEntry } from '@/app/actions/grade-entry'

interface EntryClientProps {
  exams: ExamForGradeEntry[]
}

export function EntryClient({ exams }: EntryClientProps) {
  const router = useRouter()

  // Group exams by status
  const groupedExams = useMemo(() => {
    const pending = exams.filter((e) => e.total_students > 0 && e.graded_students === 0)
    const inProgress = exams.filter(
      (e) => e.graded_students > 0 && e.graded_students < e.total_students
    )
    const completed = exams.filter(
      (e) => e.total_students > 0 && e.graded_students === e.total_students
    )
    const noStudents = exams.filter((e) => e.total_students === 0)

    return {
      pending,
      inProgress,
      completed,
      noStudents,
    }
  }, [exams])

  function getProgressPercentage(exam: ExamForGradeEntry) {
    if (exam.total_students === 0) return 0
    return Math.round((exam.graded_students / exam.total_students) * 100)
  }

  function renderExamTable(
    exams: ExamForGradeEntry[],
    title: string,
    description: string,
    icon: React.ReactNode,
    emptyMessage: string
  ) {
    if (exams.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-base">
              {exams.length}개
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
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
                {exams.map((exam) => {
                  const progress = getProgressPercentage(exam)
                  return (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div className="font-medium">{exam.name}</div>
                        {exam.classes && (
                          <div className="text-xs text-muted-foreground">
                            {exam.classes.name}
                          </div>
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
                      <TableCell className="text-center">
                        {exam.total_questions || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          {exam.total_students}명
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5 min-w-[180px]">
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
                          <Badge
                            variant={exam.average_score >= 70 ? 'default' : 'secondary'}
                          >
                            {exam.average_score}점
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
                        >
                          <PenSquare className="h-4 w-4 mr-2" />
                          성적 입력
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">성적 입력</h1>
        <p className="text-muted-foreground">
          시험별로 성적을 입력하고 진행 상황을 확인하세요
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              미입력
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-500">
              {groupedExams.pending.length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              입력 중
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {groupedExams.inProgress.length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              입력 완료
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-500">
              {groupedExams.completed.length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              학생 미배정
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {groupedExams.noStudents.length}개
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Exams */}
      {renderExamTable(
        groupedExams.pending,
        '미입력 시험',
        '아직 성적을 입력하지 않은 시험입니다',
        <Clock className="w-5 h-5 text-orange-600 dark:text-orange-500" />,
        '성적을 입력해야 할 시험이 없습니다'
      )}

      {/* In Progress Exams */}
      {renderExamTable(
        groupedExams.inProgress,
        '입력 중인 시험',
        '일부 학생의 성적이 입력된 시험입니다',
        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-500" />,
        '입력 중인 시험이 없습니다'
      )}

      {/* Completed Exams */}
      {renderExamTable(
        groupedExams.completed,
        '입력 완료된 시험',
        '모든 학생의 성적이 입력된 시험입니다',
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />,
        '입력 완료된 시험이 없습니다'
      )}

      {/* No Students Exams */}
      {groupedExams.noStudents.length > 0 && (
        renderExamTable(
          groupedExams.noStudents,
          '학생이 배정되지 않은 시험',
          '시험에 학생을 배정해주세요',
          <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
          ''
        )
      )}

      {/* Empty State */}
      {exams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <PenSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">등록된 시험이 없습니다</p>
              <p className="text-muted-foreground mb-4">
                시험을 먼저 등록하고 학생을 배정해주세요
              </p>
              <Button onClick={() => router.push('/grades/exams/new')}>
                시험 등록하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
