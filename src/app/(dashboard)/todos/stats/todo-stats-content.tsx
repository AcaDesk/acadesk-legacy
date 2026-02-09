'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { useCurrentUser } from '@/hooks/use-current-user'
import { BarChart3, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { StudentCompletionBarChart } from '@/components/features/charts/student-completion-bar-chart'

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

interface TodoWithStudent {
  student_id: string
  students: {
    student_code: string
    user_id: {
      name: string
    } | null
  } | null
  completed_at: string | null
  verified_at: string | null
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
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const { toast } = useToast()

  // Only reload when timeRange changes (not on initial render since we have initialData)
  useEffect(() => {
    // Skip initial render since we already have data
    if (timeRange === 'week') return

    if (currentUser) {
      loadAllStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, timeRange])

  async function loadAllStats() {
    setLoading(true)
    try {
      await Promise.all([
        loadOverallStats(),
        loadStudentStats(),
        loadSubjectStats(),
      ])
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

  function getDateFilter() {
    const today = new Date()
    if (timeRange === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      return weekAgo.toISOString()
    } else if (timeRange === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      return monthAgo.toISOString()
    }
    return null
  }

  async function loadOverallStats() {
    if (!currentUser) return

    try {
      const dateFilter = getDateFilter()
      let query = supabase
        .from('student_todos')
        .select('id, completed_at, verified_at, created_at')
        .eq('tenant_id', currentUser.tenantId)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const totalTodos = data?.length || 0
      const completedTodos = data?.filter(t => t.completed_at).length || 0
      const verifiedTodos = data?.filter(t => t.verified_at).length || 0
      const pendingVerification = data?.filter(t => t.completed_at && !t.verified_at).length || 0

      // Calculate average completion time (in hours)
      const completedWithTimes = data?.filter(t => t.completed_at && t.created_at) || []
      const totalCompletionTime = completedWithTimes.reduce((sum, todo) => {
        const created = new Date(todo.created_at).getTime()
        const completed = new Date(todo.completed_at!).getTime()
        return sum + (completed - created)
      }, 0)
      const averageCompletionTime = completedWithTimes.length > 0
        ? totalCompletionTime / completedWithTimes.length / (1000 * 60 * 60)
        : 0

      const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

      setOverallStats({
        totalTodos,
        completedTodos,
        verifiedTodos,
        pendingVerification,
        averageCompletionTime,
        completionRate,
      })
    } catch {
      // Silent failure - error handled by parent function
    }
  }

  async function loadStudentStats() {
    if (!currentUser) return

    try {
      const dateFilter = getDateFilter()
      let query = supabase
        .from('student_todos')
        .select(`
          id,
          completed_at,
          verified_at,
          student_id,
          students!inner (
            student_code,
            user_id (
              name
            )
          )
        `)
        .eq('tenant_id', currentUser.tenantId)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by student
      const studentMap: Map<string, StudentStats> = new Map()

      const todos = data as unknown as TodoWithStudent[]
      todos?.forEach((todo) => {
        const studentId = todo.student_id
        const studentsRel = todo.students
        const studentName = studentsRel?.user_id?.name || '이름 없음'
        const studentCode = studentsRel?.student_code || ''

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId,
            studentName,
            studentCode,
            totalTodos: 0,
            completedTodos: 0,
            verifiedTodos: 0,
            completionRate: 0,
          })
        }

        const stats = studentMap.get(studentId)
        if (stats) {
          stats.totalTodos++
          if (todo.completed_at) stats.completedTodos++
          if (todo.verified_at) stats.verifiedTodos++
        }
      })

      // Calculate completion rates
      const studentStatsArray: StudentStats[] = Array.from(studentMap.values()).map(stats => ({
        ...stats,
        completionRate: stats.totalTodos > 0
          ? (stats.completedTodos / stats.totalTodos) * 100
          : 0,
      }))

      // Sort by completion rate descending
      studentStatsArray.sort((a, b) => b.completionRate - a.completionRate)

      setStudentStats(studentStatsArray)
    } catch {
      // Silent failure - error handled by parent function
    }
  }

  async function loadSubjectStats() {
    if (!currentUser) return

    try {
      const dateFilter = getDateFilter()
      let query = supabase
        .from('student_todos')
        .select('id, subject, completed_at')
        .eq('tenant_id', currentUser.tenantId)
        .not('subject', 'is', null)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by subject
      const subjectMap = new Map<string, SubjectStats>()

      data?.forEach(todo => {
        const subject = todo.subject!

        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, {
            subject,
            totalTodos: 0,
            completedTodos: 0,
            completionRate: 0,
          })
        }

        const stats = subjectMap.get(subject)!
        stats.totalTodos++
        if (todo.completed_at) stats.completedTodos++
      })

      // Calculate completion rates
      const subjectStatsArray = Array.from(subjectMap.values()).map(stats => ({
        ...stats,
        completionRate: stats.totalTodos > 0
          ? (stats.completedTodos / stats.totalTodos) * 100
          : 0,
      }))

      // Sort by total todos descending
      subjectStatsArray.sort((a, b) => b.totalTodos - a.totalTodos)

      setSubjectStats(subjectStatsArray)
    } catch {
      // Silent failure - error handled by parent function
    }
  }

  async function handleTimeRangeChange(value: 'week' | 'month' | 'all') {
    setTimeRange(value)
    if (currentUser) {
      setLoading(true)
      try {
        // Manually trigger reload with new time range
        const today = new Date()
        let dateFilter: string | null = null

        if (value === 'week') {
          const weekAgo = new Date(today)
          weekAgo.setDate(today.getDate() - 7)
          dateFilter = weekAgo.toISOString()
        } else if (value === 'month') {
          const monthAgo = new Date(today)
          monthAgo.setMonth(today.getMonth() - 1)
          dateFilter = monthAgo.toISOString()
        }

        // Load overall stats
        let overallQuery = supabase
          .from('student_todos')
          .select('id, completed_at, verified_at, created_at')
          .eq('tenant_id', currentUser.tenantId)

        if (dateFilter) {
          overallQuery = overallQuery.gte('created_at', dateFilter)
        }

        const { data: overallData } = await overallQuery

        const totalTodos = overallData?.length || 0
        const completedTodos = overallData?.filter(t => t.completed_at).length || 0
        const verifiedTodos = overallData?.filter(t => t.verified_at).length || 0
        const pendingVerification = overallData?.filter(t => t.completed_at && !t.verified_at).length || 0

        const completedWithTimes = overallData?.filter(t => t.completed_at && t.created_at) || []
        const totalCompletionTime = completedWithTimes.reduce((sum, todo) => {
          const created = new Date(todo.created_at).getTime()
          const completed = new Date(todo.completed_at!).getTime()
          return sum + (completed - created)
        }, 0)
        const averageCompletionTime = completedWithTimes.length > 0
          ? totalCompletionTime / completedWithTimes.length / (1000 * 60 * 60)
          : 0

        const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

        setOverallStats({
          totalTodos,
          completedTodos,
          verifiedTodos,
          pendingVerification,
          averageCompletionTime,
          completionRate,
        })

        // Load student stats
        let studentQuery = supabase
          .from('student_todos')
          .select(`
            id,
            completed_at,
            verified_at,
            student_id,
            students!inner (
              student_code,
              user_id (
                name
              )
            )
          `)
          .eq('tenant_id', currentUser.tenantId)

        if (dateFilter) {
          studentQuery = studentQuery.gte('created_at', dateFilter)
        }

        const { data: studentData } = await studentQuery

        const studentMap: Map<string, StudentStats> = new Map()
        const todos = studentData as unknown as TodoWithStudent[]
        todos?.forEach((todo) => {
          const studentId = todo.student_id
          const studentsRel = todo.students
          const studentName = studentsRel?.user_id?.name || '이름 없음'
          const studentCode = studentsRel?.student_code || ''

          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              studentId,
              studentName,
              studentCode,
              totalTodos: 0,
              completedTodos: 0,
              verifiedTodos: 0,
              completionRate: 0,
            })
          }

          const stats = studentMap.get(studentId)
          if (stats) {
            stats.totalTodos++
            if (todo.completed_at) stats.completedTodos++
            if (todo.verified_at) stats.verifiedTodos++
          }
        })

        const studentStatsArray: StudentStats[] = Array.from(studentMap.values()).map(stats => ({
          ...stats,
          completionRate: stats.totalTodos > 0
            ? (stats.completedTodos / stats.totalTodos) * 100
            : 0,
        }))
        studentStatsArray.sort((a, b) => b.completionRate - a.completionRate)
        setStudentStats(studentStatsArray)

        // Load subject stats
        let subjectQuery = supabase
          .from('student_todos')
          .select('id, subject, completed_at')
          .eq('tenant_id', currentUser.tenantId)
          .not('subject', 'is', null)

        if (dateFilter) {
          subjectQuery = subjectQuery.gte('created_at', dateFilter)
        }

        const { data: subjectData } = await subjectQuery

        const subjectMap = new Map<string, SubjectStats>()
        subjectData?.forEach(todo => {
          const subject = todo.subject!

          if (!subjectMap.has(subject)) {
            subjectMap.set(subject, {
              subject,
              totalTodos: 0,
              completedTodos: 0,
              completionRate: 0,
            })
          }

          const stats = subjectMap.get(subject)!
          stats.totalTodos++
          if (todo.completed_at) stats.completedTodos++
        })

        const subjectStatsArray = Array.from(subjectMap.values()).map(stats => ({
          ...stats,
          completionRate: stats.totalTodos > 0
            ? (stats.completedTodos / stats.totalTodos) * 100
            : 0,
        }))
        subjectStatsArray.sort((a, b) => b.totalTodos - a.totalTodos)
        setSubjectStats(subjectStatsArray)

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
