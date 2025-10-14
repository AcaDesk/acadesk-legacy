'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, TrendingUp, TrendingDown, Minus, Plus, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { GradesBarChart } from '@/components/features/charts/grades-bar-chart'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { useServerPagination } from '@/hooks/use-pagination'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface ExamScore {
  id: string
  correct_answers: number
  total_questions: number
  percentage: number
  feedback: string | null
  is_retest: boolean
  retest_count: number
  created_at: string
  exams: {
    name: string
    exam_date: string
    category_code: string
  } | null
  students: {
    id: string
    student_code: string
    users: {
      name: string
    } | null
  } | null
}

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

export default function GradesListPage() {
  // All Hooks must be called before any early returns
  const [scores, setScores] = useState<ExamScore[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState<{ average: number; total: number; retests: number }>({
    average: 0,
    total: 0,
    retests: 0
  })

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const itemsPerPage = 15

  // Server-side Pagination - useServerPagination must be called before any early returns
  const {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems,
    from,
    to,
  } = useServerPagination({
    totalCount,
    itemsPerPage,
  })

  // useEffect must be called before any early returns
  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    loadScores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, selectedStudent])

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedStudent])

  // Load student statistics when a student is selected
  useEffect(() => {
    if (selectedStudent !== 'all') {
      loadStudentStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent])

  async function loadStudents() {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, users(name)')
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError
      setStudents(studentsData as any)
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  async function loadScores() {
    try {
      setLoading(true)

      // Build query with pagination
      let query = supabase
        .from('exam_scores')
        .select(`
          id,
          correct_answers,
          total_questions,
          percentage,
          feedback,
          is_retest,
          retest_count,
          created_at,
          exams (
            name,
            exam_date,
            category_code
          ),
          students (
            id,
            student_code,
            users (
              name
            )
          )
        `, { count: 'exact' })

      // Apply student filter
      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent)
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`
          students.users.name.ilike.%${searchTerm}%,
          students.student_code.ilike.%${searchTerm}%,
          exams.name.ilike.%${searchTerm}%
        `)
      }

      // Apply pagination
      query = query
        .range(from, to)
        .order('created_at', { ascending: false })

      const { data: scoresData, error: scoresError, count } = await query

      if (scoresError) throw scoresError

      // Calculate percentage if not stored
      const processedScores = (scoresData as any[]).map((score) => ({
        ...score,
        percentage: score.percentage ||
          (score.total_questions > 0
            ? Math.round((score.correct_answers / score.total_questions) * 10000) / 100
            : 0)
      }))

      setScores(processedScores)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading scores:', error)
      toast({
        title: '데이터 로드 오류',
        description: '성적 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function getScoreBadgeVariant(percentage: number) {
    if (percentage >= 90) return 'default'
    if (percentage >= 80) return 'secondary'
    if (percentage >= 70) return 'outline'
    return 'destructive'
  }

  function getScoreTrend(currentScore: ExamScore, index: number): 'up' | 'down' | 'same' | null {
    // Trend calculation would need additional data fetching for accurate comparison
    // For now, return null to avoid incorrect calculations with paginated data
    return null
  }

  async function loadStudentStats() {
    try {
      const { data, error } = await supabase
        .from('exam_scores')
        .select('percentage, correct_answers, total_questions, is_retest')
        .eq('student_id', selectedStudent)

      if (error) throw error
      if (!data || data.length === 0) {
        setStudentStats({ average: 0, total: 0, retests: 0 })
        return
      }

      // Calculate average for non-retest scores
      const nonRetestScores = data.filter(s => !s.is_retest)
      const processedScores = nonRetestScores.map((score) =>
        score.percentage ||
        (score.total_questions > 0
          ? Math.round((score.correct_answers / score.total_questions) * 10000) / 100
          : 0)
      )

      const average = processedScores.length > 0
        ? Math.round((processedScores.reduce((acc, p) => acc + p, 0) / processedScores.length) * 100) / 100
        : 0

      setStudentStats({
        average,
        total: nonRetestScores.length,
        retests: data.filter(s => s.is_retest).length
      })
    } catch (error) {
      console.error('Error loading student stats:', error)
      setStudentStats({ average: 0, total: 0, retests: 0 })
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/grades')}
            className="hover:text-foreground transition-colors"
          >
            성적 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">성적 조회</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">성적 조회</h1>
            <p className="text-muted-foreground">학생별 시험 성적을 조회합니다</p>
          </div>
          <Button onClick={() => router.push('/grades')}>
            <Plus className="h-4 w-4 mr-2" />
            성적 입력
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름, 학번, 시험명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="학생 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학생</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.student_code} - {student.users?.name || '이름 없음'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
            {startIndex}-{endIndex} / {totalItems}개 결과
          </Badge>
        </div>

        {/* Statistics Cards */}
        {selectedStudent !== 'all' && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>평균 점수</CardDescription>
                  <CardTitle className="text-3xl">
                    {studentStats.average}%
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>총 시험 횟수</CardDescription>
                  <CardTitle className="text-3xl">
                    {studentStats.total}회
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>재시험 횟수</CardDescription>
                  <CardTitle className="text-3xl">
                    {studentStats.retests}회
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Student Grade Charts */}
            {scores.length > 0 && (
              <GradesLineChart
                data={scores
                  .filter(s => !s.is_retest)
                  .slice(0, 10)
                  .reverse()
                  .map(score => ({
                    examName: score.exams?.name || '시험',
                    score: score.percentage,
                    date: score.exams?.exam_date,
                  }))}
                title="성적 추이"
                description="최근 시험별 점수 변화"
                showClassAverage={false}
              />
            )}
          </>
        )}

        {/* Scores Table */}
        <Card>
          <CardHeader>
            <CardTitle>성적 목록</CardTitle>
            <CardDescription>
              등록된 모든 시험 성적을 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>등록된 성적이 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>시험명</TableHead>
                      <TableHead>시험일</TableHead>
                      <TableHead className="text-center">점수</TableHead>
                      <TableHead className="text-center">추세</TableHead>
                      <TableHead>피드백</TableHead>
                      <TableHead>입력일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score, index) => {
                      const trend = getScoreTrend(score, index)
                      return (
                        <TableRow key={score.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {score.students?.users?.name || '이름 없음'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {score.students?.student_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{score.exams?.name || '시험 정보 없음'}</div>
                              {score.is_retest && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  재시험 #{score.retest_count}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {score.exams?.exam_date
                              ? new Date(score.exams.exam_date).toLocaleDateString('ko-KR')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant={getScoreBadgeVariant(score.percentage)}>
                                {score.percentage}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {score.correct_answers}/{score.total_questions}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {trend === 'up' && (
                              <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                            )}
                            {trend === 'down' && (
                              <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                            )}
                            {trend === 'same' && (
                              <Minus className="h-4 w-4 text-gray-400 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {score.feedback ? (
                              <div className="text-sm text-muted-foreground truncate">
                                {score.feedback}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(score.created_at).toLocaleDateString('ko-KR')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  페이지 {currentPage} / {totalPages}
                </div>
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
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
