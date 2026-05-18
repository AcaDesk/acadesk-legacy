'use client'

import { useState } from 'react'
import { getTodoStats, type TodoStatsPeriod } from '@/app/actions/todos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { BarChart3, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import dynamic from 'next/dynamic'

const StudentCompletionBarChart = dynamic(
  () => import('@/components/features/charts/student-completion-bar-chart').then(m => m.StudentCompletionBarChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-muted" /> }
)

interface TodoStats {
  totalTodos: number
  completedTodos: number
  verifiedTodos: number
  pendingVerification: number
  averageCompletionTime: number
  completionRate: number
}

interface StudentStats {
  studentId: string
  studentName: string
  studentCode: string
  totalTodos: number
  completedTodos: number
  verifiedTodos: number
  completionRate: number
}

interface SubjectStats {
  subject: string
  totalTodos: number
  completedTodos: number
  completionRate: number
}

interface TodoStatsContentProps {
  initialOverallStats: TodoStats | null
  initialStudentStats: StudentStats[]
  initialSubjectStats: SubjectStats[]
}

export function TodoStatsContent({
  initialOverallStats,
  initialStudentStats,
  initialSubjectStats,
}: TodoStatsContentProps) {
  const [overallStats, setOverallStats] = useState<TodoStats | null>(initialOverallStats)
  const [studentStats, setStudentStats] = useState<StudentStats[]>(initialStudentStats)
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>(initialSubjectStats)
  const [timeRange, setTimeRange] = useState<TodoStatsPeriod>('week')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleTimeRangeChange(value: TodoStatsPeriod) {
    setTimeRange(value)
    setLoading(true)
    try {
      const result = await getTodoStats(value)
      if (!result.success) {
        throw new Error(result.error || '통계를 불러오지 못했습니다.')
      }
      setOverallStats(result.data.overallStats)
      setStudentStats(result.data.studentStats)
      setSubjectStats(result.data.subjectStats)
    } catch (error) {
      toast({
        title: '통계 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            과제 통계
          </h1>
          <p className="text-muted-foreground mt-1">
            학생별, 과목별 과제 완료 현황을 확인하세요
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value) => handleTimeRangeChange(value as typeof timeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">최근 1주</SelectItem>
            <SelectItem value="month">최근 1개월</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">로딩 중...</div>
      ) : (
        <>
          {/* Overall Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 과제</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats?.totalTodos || 0}</div>
                <p className="text-xs text-muted-foreground">
                  완료율 {Math.round(overallStats?.completionRate || 0)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats?.completedTodos || 0}</div>
                <Progress
                  value={overallStats?.completionRate || 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">검증 완료</CardTitle>
                <TrendingUp className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats?.verifiedTodos || 0}</div>
                <p className="text-xs text-muted-foreground">
                  검증률{' '}
                  {overallStats?.completedTodos
                    ? Math.round(((overallStats?.verifiedTodos || 0) / overallStats.completedTodos) * 100)
                    : 0}
                  %
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">검증 대기</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats?.pendingVerification || 0}</div>
                <p className="text-xs text-muted-foreground">
                  평균 완료시간 {Math.round(overallStats?.averageCompletionTime || 0)}시간
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Student Completion Chart */}
          <StudentCompletionBarChart data={studentStats} maxStudents={10} />

          {/* Student Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                학생별 통계
              </CardTitle>
              <CardDescription>학생별 과제 완료 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">통계 데이터가 없습니다.</p>
                ) : (
                  studentStats.map(student => (
                    <div key={student.studentId} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{student.studentName}</p>
                          <Badge variant="outline" className="text-xs">
                            {student.studentCode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>총 {student.totalTodos}개</span>
                          <span>완료 {student.completedTodos}개</span>
                          <span>검증 {student.verifiedTodos}개</span>
                        </div>
                        <Progress value={student.completionRate} className="mt-2" />
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="text-2xl font-bold">{Math.round(student.completionRate)}%</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subject Stats */}
          <Card>
            <CardHeader>
              <CardTitle>과목별 통계</CardTitle>
              <CardDescription>과목별 과제 완료 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">통계 데이터가 없습니다.</p>
                ) : (
                  subjectStats.map(subject => (
                    <div key={subject.subject} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{subject.subject}</Badge>
                          <span className="text-sm text-muted-foreground">
                            총 {subject.totalTodos}개 | 완료 {subject.completedTodos}개
                          </span>
                        </div>
                        <Progress value={subject.completionRate} className="mt-2" />
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="text-2xl font-bold">{Math.round(subject.completionRate)}%</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
