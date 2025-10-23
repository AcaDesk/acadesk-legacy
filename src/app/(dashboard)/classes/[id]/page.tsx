'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  TrendingUp,
  Target,
  CheckCircle,
  BookOpen,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { GradesBarChart } from '@/components/features/charts/grades-bar-chart'
import { TodoCompletionBar } from '@/components/features/charts/todo-completion-bar'
import { AttendanceComboChart } from '@/components/features/charts/attendance-combo-chart'
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

interface ClassDetail {
  id: string
  name: string
  description: string | null
  subject: string | null
  grade_level: string | null
  instructor_id: string | null
  max_students: number | null
  room: string | null
  schedule: string | null
}

interface StudentInClass {
  id: string
  student_code: string
  users: {
    name: string
  } | null
  avgScore: number
  attendanceRate: number
  homeworkRate: number
}

interface Enrollment {
  student_id: string
  students: {
    id: string
    student_code: string
    users: {
      name: string
    }[]
  }[]
}

interface ExamScore {
  student_id: string
  percentage: number
}

interface AttendanceRecord {
  student_id: string
  status: string
}

interface TodoRecord {
  student_id: string
  completed_at: string | null
}

export default function ClassDetailPage() {
  // All Hooks must be called before any early returns
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [classData, setClassData] = useState<ClassDetail | null>(null)
  const [students, setStudents] = useState<StudentInClass[]>([])
  const [loading, setLoading] = useState(true)

  // Load class detail and students - defined before feature check
  const loadClassDetail = useCallback(async (classId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('Error fetching class:', error)
        throw error
      }

      if (!data) {
        throw new Error('수업 정보를 찾을 수 없습니다.')
      }

      setClassData(data as ClassDetail)
    } catch (error) {
      console.error('Error loading class:', error)
      toast({
        title: '데이터 로드 오류',
        description: '수업 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  const loadStudents = useCallback(async (classId: string) => {
    try {
      // Load students enrolled in this class
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          students!inner (
            id,
            student_code,
            users!inner (
              name
            )
          )
        `)
        .eq('class_id', classId)
        .is('deleted_at', null)

      if (enrollError) throw enrollError

      if (!enrollments || enrollments.length === 0) {
        setStudents([])
        return
      }

      // Calculate stats for each student
      const studentIds = (enrollments as unknown as Enrollment[]).map((e) => e.student_id).filter(Boolean)

      // Get exam scores
      const { data: scores, error: scoresError } = await supabase
        .from('exam_scores')
        .select('student_id, percentage')
        .in('student_id', studentIds)

      if (scoresError) throw scoresError

      // Get attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)

      if (attendanceError) throw attendanceError

      // Get homework completion
      const { data: todos, error: todosError } = await supabase
        .from('student_todos')
        .select('student_id, completed_at')
        .in('student_id', studentIds)

      if (todosError) throw todosError

      // Calculate stats per student
      const studentsWithStats: StudentInClass[] = (enrollments as unknown as Enrollment[]).map((enrollment) => {
        // Access the first element since Supabase returns arrays for joins
        const student = enrollment.students?.[0]
        const studentId = enrollment.student_id

        // Calculate average score
        const studentScores = (scores as unknown as ExamScore[])?.filter((s) => s.student_id === studentId) || []
        const avgScore = studentScores.length > 0
          ? Math.round(studentScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / studentScores.length)
          : 0

        // Calculate attendance rate
        const studentAttendance = (attendance as unknown as AttendanceRecord[])?.filter((a) => a.student_id === studentId) || []
        const presentCount = studentAttendance.filter((a) => a.status === 'present').length
        const attendanceRate = studentAttendance.length > 0
          ? Math.round((presentCount / studentAttendance.length) * 100)
          : 0

        // Calculate homework completion rate
        const studentTodos = (todos as unknown as TodoRecord[])?.filter((t) => t.student_id === studentId) || []
        const completedCount = studentTodos.filter((t) => t.completed_at).length
        const homeworkRate = studentTodos.length > 0
          ? Math.round((completedCount / studentTodos.length) * 100)
          : 0

        const userName = student?.users?.[0]?.name

        return {
          id: student?.id || '',
          student_code: student?.student_code || '',
          users: userName ? { name: userName } : null,
          avgScore,
          attendanceRate,
          homeworkRate,
        }
      })

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }, [supabase])

  // useEffect must be called before any early returns
  useEffect(() => {
    if (params.id) {
      const classId = params.id as string
      loadClassDetail(classId)
      loadStudents(classId)
    }
  }, [params.id, loadClassDetail, loadStudents])

  // usePagination must be called before any early returns
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

  // Generate sample chart data (실제로는 DB에서 가져와야 함)
  const generateChartData = () => {
    // Grade distribution by subject
    const gradesData = [
      { subject: '수학', score: 85, classAverage: 80, highest: 95, lowest: 65 },
      { subject: '영어', score: 88, classAverage: 82, highest: 98, lowest: 70 },
      { subject: '국어', score: 82, classAverage: 78, highest: 92, lowest: 60 },
    ]

    // Weekly homework completion trend
    const todoData = [
      { period: '1주차', completionRate: 85, classAverage: 80 },
      { period: '2주차', completionRate: 88, classAverage: 82 },
      { period: '3주차', completionRate: 92, classAverage: 88 },
      { period: '4주차', completionRate: 90, classAverage: 85 },
    ]

    // Monthly attendance data
    const attendanceData = [
      { period: '1월', present: 180, late: 10, absent: 5, rate: 92 },
      { period: '2월', present: 175, late: 8, absent: 7, rate: 91 },
      { period: '3월', present: 190, late: 5, absent: 3, rate: 96 },
    ]

    return { gradesData, todoData, attendanceData }
  }

  // Now we can have early returns after all Hooks have been called
  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  if (!classData) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">수업을 찾을 수 없습니다.</p>
          <Button className="mt-4" onClick={() => router.push('/classes')}>
            목록으로 돌아가기
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const kpis = calculateClassKPIs()
  const chartData = generateChartData()

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => router.push('/classes')} className="hover:text-foreground transition-colors">
              수업 관리
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{classData.name}</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{classData.name}</h1>
              <p className="text-muted-foreground">{classData.description || '수업 설명 없음'}</p>
            </div>
            <Button onClick={() => router.push(`/classes/${classData.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </div>

          {/* Class KPI Badges */}
          <div className="flex gap-3 flex-wrap">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Users className="h-4 w-4 mr-2" />
              수강생: <span className="font-bold ml-1">{students.length}명</span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              평균 성적: <span className={`font-bold ml-1 ${kpis.avgScore >= 90 ? 'text-green-600' : kpis.avgScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgScore}점
              </span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Target className="h-4 w-4 mr-2" />
              평균 출석률: <span className={`font-bold ml-1 ${kpis.avgAttendance >= 90 ? 'text-green-600' : kpis.avgAttendance >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgAttendance}%
              </span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              평균 과제율: <span className={`font-bold ml-1 ${kpis.avgHomework >= 90 ? 'text-green-600' : kpis.avgHomework >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgHomework}%
              </span>
            </Badge>
          </div>
        </div>

        {/* Basic Info Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">과목 · 학년</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{classData.subject || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{classData.grade_level || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">수업 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{classData.schedule || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">강의실: {classData.room || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">정원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {students.length} / {classData.max_students || '무제한'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="students">수강생 목록</TabsTrigger>
            <TabsTrigger value="performance">성적 분석</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts Section */}
            <div className="space-y-6">
              {/* Grades Bar Chart */}
              <GradesBarChart
                data={chartData.gradesData}
                title="과목별 반 평균 성적"
                description="과목별 반 평균, 최고점, 최저점 비교"
                showComparison={true}
              />

              {/* Attendance & Homework Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Attendance Combo Chart */}
                <AttendanceComboChart
                  data={chartData.attendanceData}
                  title="월별 출석 현황"
                  description="출석/지각/결석 횟수 및 출석율"
                />

                {/* Todo Completion Bar */}
                <TodoCompletionBar
                  data={chartData.todoData}
                  title="주별 과제 완료율"
                  description="주별 과제 완료율 추이"
                  showClassAverage={false}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>평균 성적</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{kpis.avgScore}점</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    전체 학생 평균 성적
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>평균 출석률</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{kpis.avgAttendance}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    전체 학생 평균 출석률
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>평균 과제 완료율</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{kpis.avgHomework}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    전체 학생 평균 과제 완료율
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>수강생 목록</CardTitle>
                <CardDescription>
                  이 수업을 수강하는 모든 학생을 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>등록된 수강생이 없습니다.</p>
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
                                <div className="font-medium">
                                  {student.users?.name || '이름 없음'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.student_code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={student.avgScore >= 90 ? 'default' : student.avgScore >= 70 ? 'secondary' : 'destructive'}>
                                {student.avgScore}점
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${student.attendanceRate >= 90 ? 'text-green-600' : student.attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {student.attendanceRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${student.homeworkRate >= 90 ? 'text-green-600' : student.homeworkRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {student.homeworkRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/students/${student.id}`)}
                              >
                                상세보기
                              </Button>
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
                      {students
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
                                  {student.users?.name || '이름 없음'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.student_code}
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
