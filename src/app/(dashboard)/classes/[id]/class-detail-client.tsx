'use client'

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
  TrendingUp,
  Target,
  CheckCircle,
  BookOpen,
} from 'lucide-react'
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

// Schedule을 한글 문자열로 변환하는 헬퍼 함수
function formatSchedule(schedule: Record<string, unknown> | null): string {
  if (!schedule || typeof schedule !== 'object') return '-'

  const days = schedule.days as string[] | undefined
  const time = schedule.time as string | undefined

  if (days && time) {
    const dayMap: Record<string, string> = {
      'monday': '월',
      'tuesday': '화',
      'wednesday': '수',
      'thursday': '목',
      'friday': '금',
      'saturday': '토',
      'sunday': '일',
    }
    const koreanDays = days.map(d => dayMap[d.toLowerCase()] || d).join('/')
    return `${koreanDays} ${time}`
  }

  return JSON.stringify(schedule)
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
}

export function ClassDetailClient({ classData, students }: ClassDetailClientProps) {
  const router = useRouter()

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
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
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
              평균 성적: <span className={`font-bold ml-1 ${kpis.avgScore >= 90 ? 'text-success' : kpis.avgScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgScore}점
              </span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Target className="h-4 w-4 mr-2" />
              평균 출석률: <span className={`font-bold ml-1 ${kpis.avgAttendance >= 90 ? 'text-success' : kpis.avgAttendance >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgAttendance}%
              </span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              평균 과제율: <span className={`font-bold ml-1 ${kpis.avgHomework >= 90 ? 'text-success' : kpis.avgHomework >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpis.avgHomework}%
              </span>
            </Badge>
          </div>
        </div>

        {/* Basic Info Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">과목 / 학년</CardTitle>
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
                  <span className="text-sm">{formatSchedule(classData.schedule)}</span>
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
                  {students.length} / {classData.capacity || '무제한'}
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
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>평균 성적</CardDescription>
                  <CardTitle className="text-3xl text-info">{kpis.avgScore}점</CardTitle>
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
                  <CardTitle className="text-3xl text-success">{kpis.avgAttendance}%</CardTitle>
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
                                  {student.name}
                                </div>
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
