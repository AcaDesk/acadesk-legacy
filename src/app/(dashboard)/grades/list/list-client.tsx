'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Search, Plus, X, ArrowUpDown } from 'lucide-react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

interface ExamScore {
  id: string
  score: number | null
  total_points: number | null
  percentage: number | null
  feedback: string | null
  status: 'pending' | 'completed' | 'retest_required' | 'retest_waived' | null
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

export function GradesListClient() {
  // All Hooks must be called before any early returns
  const [scores, setScores] = useState<ExamScore[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState<{ average: number; total: number; retests: number }>({
    average: 0,
    total: 0,
    retests: 0
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const router = useRouter()
  const supabase = createClient()

  // useEffect must be called before any early returns
  useEffect(() => {
    if (!userLoading && currentUser) {
      loadStudents()
      loadScores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userLoading])

  // Load student statistics when a student is selected
  useEffect(() => {
    if (selectedStudent !== 'all') {
      loadStudentStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent])

  async function loadStudents() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, users!user_id(name)')
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError
      setStudents(studentsData as unknown as Student[])
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  async function loadScores() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      setLoading(true)

      // Supabase에서 모든 성적 데이터 조회 (클라이언트 사이드 필터링을 위해)
      const { data: scoresData, error: scoresError } = await supabase
        .from('exam_scores')
        .select(`
          id,
          score,
          total_points,
          percentage,
          feedback,
          status,
          is_retest,
          retest_count,
          created_at,
          exams!exam_id (
            name,
            exam_date,
            category_code
          ),
          students!student_id (
            id,
            student_code,
            users!user_id (
              name
            )
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (scoresError) throw scoresError

      setScores(scoresData as unknown as ExamScore[])
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

  function getStatusBadge(status: ExamScore['status']) {
    switch (status) {
      case 'pending':
        return { label: '입력 대기', variant: 'outline' as const, className: 'text-gray-500' }
      case 'completed':
        return { label: '완료', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' }
      case 'retest_required':
        return { label: '재시험 필요', variant: 'destructive' as const, className: '' }
      case 'retest_waived':
        return { label: '재시험 면제', variant: 'secondary' as const, className: '' }
      default:
        return { label: '미정', variant: 'outline' as const, className: 'text-gray-400' }
    }
  }

  async function loadStudentStats() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      const { data, error } = await supabase
        .from('exam_scores')
        .select('percentage, score, total_points, is_retest')
        .eq('tenant_id', currentUser.tenantId)
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
        (score.total_points && score.total_points > 0 && score.score !== null
          ? Math.round((score.score / score.total_points) * 10000) / 100
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

  // 필터링된 데이터 (학생 및 상태 필터 적용)
  const filteredScores = useMemo(() => {
    let filtered = scores

    // 학생 필터
    if (selectedStudent !== 'all') {
      filtered = filtered.filter(score => score.students?.id === selectedStudent)
    }

    // 상태 필터
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(score => score.status === selectedStatus)
    }

    return filtered
  }, [scores, selectedStudent, selectedStatus])

  // 테이블 컬럼 정의
  const columns: ColumnDef<ExamScore>[] = useMemo(() => [
    {
      accessorKey: 'students',
      header: '학생',
      cell: ({ row }) => {
        const student = row.original.students
        return (
          <div>
            <div className="font-medium">
              {student?.users?.name || '이름 없음'}
            </div>
            <div className="text-xs text-muted-foreground">
              {student?.student_code}
            </div>
          </div>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        const score = row.original
        const searchTerm = filterValue.toLowerCase()

        // 학생명, 학번, 시험명으로 검색
        return (
          score.students?.users?.name?.toLowerCase().includes(searchTerm) ||
          score.students?.student_code?.toLowerCase().includes(searchTerm) ||
          score.exams?.name?.toLowerCase().includes(searchTerm) ||
          false
        )
      },
    },
    {
      accessorKey: 'exams',
      header: '시험명',
      cell: ({ row }) => {
        const score = row.original
        return (
          <div>
            <div>{score.exams?.name || '시험 정보 없음'}</div>
            {score.is_retest && (
              <Badge variant="outline" className="text-xs mt-1">
                재시험 #{score.retest_count}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'exam_date',
      header: '시험일',
      cell: ({ row }) => {
        const examDate = row.original.exams?.exam_date
        return (
          <div className="text-sm text-muted-foreground">
            {examDate ? new Date(examDate).toLocaleDateString('ko-KR') : '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'percentage',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 text-center w-full justify-center"
          >
            점수
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const score = row.original
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge variant={getScoreBadgeVariant(score.percentage || 0)}>
              {score.percentage || 0}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {score.score || 0}/{score.total_points || 0}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '처리 상태',
      cell: ({ row }) => {
        const statusBadge = getStatusBadge(row.original.status)
        return (
          <div className="text-center">
            <Badge
              variant={statusBadge.variant}
              className={statusBadge.className}
            >
              {statusBadge.label}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'feedback',
      header: '피드백',
      cell: ({ row }) => {
        const feedback = row.getValue('feedback') as string | null
        return feedback ? (
          <div className="text-sm text-muted-foreground truncate max-w-xs">
            {feedback}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: '입력일',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.getValue('created_at')).toLocaleDateString('ko-KR')}
        </div>
      ),
    },
  ], [])

  // 테이블 초기화
  const table = useReactTable({
    data: filteredScores,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  const searchValue = (table.getColumn('students')?.getFilterValue() as string) ?? ''

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.gradesManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="성적 조회" description="학생별 시험 성적을 상세하게 조회하고, 성적 추이를 차트로 확인할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="성적 조회" reason="성적 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading || userLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageErrorBoundary pageName="성적 조회">
      <PageWrapper>
        <div className="space-y-6">
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
              value={searchValue}
              onChange={(e) => table.getColumn('students')?.setFilterValue(e.target.value)}
              className="pl-10"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => table.getColumn('students')?.setFilterValue('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="처리 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="pending">입력 대기</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="retest_required">재시험 필요</SelectItem>
              <SelectItem value="retest_waived">재시험 면제</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
            {table.getFilteredRowModel().rows.length}개 결과
          </Badge>
        </div>

        {/* Statistics Cards */}
        {selectedStudent !== 'all' && (
          <>
            <SectionErrorBoundary sectionName="학생 통계">
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
            </SectionErrorBoundary>

            {/* Student Grade Charts */}
            {scores.length > 0 && (
              <SectionErrorBoundary sectionName="성적 추이 차트">
                <GradesLineChart
                  data={scores
                    .filter(s => !s.is_retest)
                    .slice(0, 10)
                    .reverse()
                    .map(score => ({
                      examName: score.exams?.name || '시험',
                      score: score.percentage || 0,
                      date: score.exams?.exam_date,
                    }))}
                  title="성적 추이"
                  description="최근 시험별 점수 변화"
                  showClassAverage={false}
                />
              </SectionErrorBoundary>
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {loading ? (
                          <div className="text-muted-foreground">로딩 중...</div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>등록된 성적이 없습니다.</p>
                            {searchValue && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {table.getPageCount() > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                  전체 {table.getFilteredRowModel().rows.length}개
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                    <label htmlFor="rows-per-page" className="text-sm font-medium">
                      페이지당 행 수
                    </label>
                    <Select
                      value={`${table.getState().pagination.pageSize}`}
                      onValueChange={(value) => {
                        table.setPageSize(Number(value))
                      }}
                    >
                      <SelectTrigger className="w-20" id="rows-per-page">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 15, 20, 30, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-fit items-center justify-center text-sm font-medium">
                    페이지 {table.getState().pagination.pageIndex + 1} /{' '}
                    {table.getPageCount()}
                  </div>
                  <div className="ml-auto flex items-center gap-2 lg:ml-0">
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">첫 페이지로</span>
                      <IconChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">이전 페이지</span>
                      <IconChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">다음 페이지</span>
                      <IconChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">마지막 페이지로</span>
                      <IconChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
    </PageErrorBoundary>
  )
}
