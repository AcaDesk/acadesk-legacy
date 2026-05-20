'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
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
  Users,
  Calendar,
  Clock,
  GraduationCap,
  BookOpen,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { usePagination } from '@/hooks/use-pagination'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@ui/pagination'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { withdrawStudentFromClass } from '@/app/actions/classes'
import type { StudentMaster } from '@/app/actions/students/queries'
import { EnrollStudentsDialog } from '@/components/features/classes/enroll-students-dialog'

interface ClassDetail {
  id: string
  name: string
  description: string | null
  subject: string | null
  grade_level: string | null
  instructor_id: string | null
  capacity: number | null
  room: string | null
  schedule: Record<string, unknown> | null
  instructorName: string | null
  studentCount: number
}

const DAY_MAP: Record<string, string> = {
  monday: '월', tuesday: '화', wednesday: '수', thursday: '목',
  friday: '금', saturday: '토', sunday: '일',
}

// Schedule을 한글 문자열로 변환하는 헬퍼 함수
function formatSchedule(schedule: Record<string, unknown> | null): string {
  if (!schedule || typeof schedule !== 'object') return '-'

  const days = schedule.days as string[] | undefined
  const startTime = (schedule.startTime ?? schedule.time) as string | undefined
  const endTime = schedule.endTime as string | undefined

  if (!days?.length) return '-'

  const koreanDays = days.map(d => DAY_MAP[d.toLowerCase()] || d).join('/')

  if (startTime && endTime) return `${koreanDays} ${startTime}~${endTime}`
  if (startTime) return `${koreanDays} ${startTime}`
  return koreanDays
}

interface StudentInClass {
  id: string
  studentCode: string
  name: string
  avgScore: number
  attendanceRate: number
  homeworkRate: number
}

interface ClassDetailClientProps {
  classData: ClassDetail
  students: StudentInClass[]
  studentsMaster: StudentMaster[]
}

export function ClassDetailClient({ classData, students: initialStudents, studentsMaster }: ClassDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentInClass[]>(initialStudents)
  const [, startTransition] = useTransition()

  // router.refresh() 후 서버에서 갱신된 students 목록을 로컬 state에 동기화.
  useEffect(() => {
    setStudents(initialStudents)
  }, [initialStudents])

  async function handleWithdraw(studentId: string, studentName: string) {
    setWithdrawingId(studentId)
    // 낙관적 UI: 서버 응답을 기다리지 않고 즉시 목록에서 제거
    const previousStudents = students
    setStudents((prev) => prev.filter((s) => s.id !== studentId))
    try {
      const result = await withdrawStudentFromClass(classData.id, studentId)
      if (!result.success) {
        setStudents(previousStudents)
        toast({ title: '배정 해제 실패', description: result.error ?? '배정 해제 중 오류가 발생했습니다', variant: 'destructive' })
        return
      }
      toast({ title: `${studentName} 배정 해제 완료` })
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setStudents(previousStudents)
      toast({ title: '배정 해제 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setWithdrawingId(null)
    }
  }

  // usePagination for students table
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedStudents,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({
    data: students,
    itemsPerPage: 10,
  })

  // Calculate class-level KPIs
  const calculateClassKPIs = () => {
    if (students.length === 0) {
      return {
        avgScore: 0,
        avgAttendance: 0,
        avgHomework: 0,
      }
    }

    const avgScore = Math.round(
      students.reduce((sum, s) => sum + s.avgScore, 0) / students.length
    )

    const avgAttendance = Math.round(
      students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length
    )

    const avgHomework = Math.round(
      students.reduce((sum, s) => sum + s.homeworkRate, 0) / students.length
    )

    return { avgScore, avgAttendance, avgHomework }
  }

  const kpis = calculateClassKPIs()

  return (
    <PageWrapper>
      <EnrollStudentsDialog
        classId={classData.id}
        studentsMaster={studentsMaster}
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onSuccess={() => {
          startTransition(() => {
            router.refresh()
          })
        }}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
            <p className="text-muted-foreground">{classData.description || '수업 설명 없음'}</p>
          </div>
          <Button onClick={() => router.push(`/classes/${classData.id}/edit`)} className="shrink-0">
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
        </div>

        {/* 통합 수업 요약 카드 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">수업 요약</CardTitle>
              <span className="text-xs text-muted-foreground">
                정원 {classData.capacity ?? '무제한'}
                {classData.capacity ? ` · ${Math.round((students.length / classData.capacity) * 100)}% 사용` : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground">수강생</p>
                <p className="text-3xl font-bold tracking-tight leading-none mt-1">
                  {students.length}
                  <span className="text-base font-normal text-muted-foreground ml-0.5">
                    명
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-5 sm:gap-7">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-1))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">평균 성적</p>
                    <p
                      className={`text-base font-semibold ${kpis.avgScore >= 90 ? 'text-success' : kpis.avgScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {kpis.avgScore}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        점
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">평균 출석률</p>
                    <p
                      className={`text-base font-semibold ${kpis.avgAttendance >= 90 ? 'text-success' : kpis.avgAttendance >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {kpis.avgAttendance}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        %
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-3))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">평균 과제율</p>
                    <p
                      className={`text-base font-semibold ${kpis.avgHomework >= 90 ? 'text-success' : kpis.avgHomework >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {kpis.avgHomework}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        %
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 수업 메타 정보 인라인 */}
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="text-foreground">{classData.subject || '-'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="text-foreground">{classData.grade_level || '-'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-foreground">{formatSchedule(classData.schedule)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-foreground">
                  강의실 {classData.room || '-'}
                </span>
              </span>
              {classData.instructorName && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-foreground">{classData.instructorName}</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">수강생 목록</TabsTrigger>
            <TabsTrigger value="performance">성적 분석</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>수강생 목록</CardTitle>
                    <CardDescription>
                      이 수업을 수강하는 모든 학생을 확인할 수 있습니다
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    학생 배정
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">등록된 수강생이 없습니다.</p>
                    <Button variant="outline" size="sm" onClick={() => setEnrollDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      학생 배정하기
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>학생</TableHead>
                          <TableHead className="text-center">평균 성적</TableHead>
                          <TableHead className="text-center">출석률</TableHead>
                          <TableHead className="text-center">과제 완료율</TableHead>
                          <TableHead className="text-center">액션</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {student.studentCode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={student.avgScore >= 90 ? 'default' : student.avgScore >= 70 ? 'secondary' : 'destructive'}>
                                {student.avgScore}점
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${student.attendanceRate >= 90 ? 'text-success' : student.attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {student.attendanceRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${student.homeworkRate >= 90 ? 'text-success' : student.homeworkRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {student.homeworkRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/students/${student.id}`)}
                                >
                                  상세보기
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={withdrawingId === student.id}
                                  onClick={() => handleWithdraw(student.id, student.name)}
                                >
                                  {withdrawingId === student.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={previousPage}
                                className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              ) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => goToPage(page)}
                                      isActive={currentPage === page}
                                      className="cursor-pointer"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              } else if (page === currentPage - 2 || page === currentPage + 2) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              }
                              return null
                            })}

                            <PaginationItem>
                              <PaginationNext
                                onClick={nextPage}
                                className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>성적 분석</CardTitle>
                <CardDescription>
                  반 전체의 성적 분포와 통계를 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Grade Distribution */}
                  <div>
                    <h3 className="font-semibold mb-4">성적 분포</h3>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>90점 이상</CardDescription>
                          <CardTitle className="text-2xl">
                            {students.filter(s => s.avgScore >= 90).length}명
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>80-89점</CardDescription>
                          <CardTitle className="text-2xl">
                            {students.filter(s => s.avgScore >= 80 && s.avgScore < 90).length}명
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>70-79점</CardDescription>
                          <CardTitle className="text-2xl">
                            {students.filter(s => s.avgScore >= 70 && s.avgScore < 80).length}명
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>70점 미만</CardDescription>
                          <CardTitle className="text-2xl">
                            {students.filter(s => s.avgScore < 70).length}명
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div>
                    <h3 className="font-semibold mb-4">상위 성적 학생</h3>
                    <div className="space-y-2">
                      {[...students]
                        .sort((a, b) => b.avgScore - a.avgScore)
                        .slice(0, 5)
                        .map((student, index) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-bold text-muted-foreground">
                                #{index + 1}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {student.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.studentCode}
                                </div>
                              </div>
                            </div>
                            <Badge variant="default" className="text-base px-4 py-1">
                              {student.avgScore}점
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
