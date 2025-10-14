'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { BarChart3, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
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

export default function TodoStatsPage() {
  // All Hooks must be called before any early returns
  const [overallStats, setOverallStats] = useState<TodoStats | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()
  const { toast } = useToast()

  useEffect(() => {
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
    } catch (error) {
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
          students (
            student_code,
            users (
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
      const studentMap = new Map<string, StudentStats>()

      interface TodoWithStudent {
        student_id: string
        completed_at: string | null
        verified_at: string | null
        students?: {
          student_code?: string
          users?: {
            name?: string
          }
        }
      }

      data?.forEach((todo: TodoWithStudent) => {
        const studentId = todo.student_id
        const studentName = todo.students?.users?.name || '이름 없음'
        const studentCode = todo.students?.student_code || ''

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

        const stats = studentMap.get(studentId)!
        stats.totalTodos++
        if (todo.completed_at) stats.completedTodos++
        if (todo.verified_at) stats.verifiedTodos++
      })

      // Calculate completion rates
      const studentStatsArray = Array.from(studentMap.values()).map(stats => ({
        ...stats,
        completionRate: stats.totalTodos > 0
          ? (stats.completedTodos / stats.totalTodos) * 100
          : 0,
      }))

      // Sort by completion rate descending
      studentStatsArray.sort((a, b) => b.completionRate - a.completionRate)

      setStudentStats(studentStatsArray)
    } catch (error) {
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
    } catch (error) {
      // Silent failure - error handled by parent function
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 통계" description="학생별, 과목별 과제 완료 현황을 상세한 통계로 확인하고 분석할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 통계" reason="통계 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              과제 통계
            </h1>
            <p className="text-muted-foreground mt-1">
              학생별, 과목별 과제 완료 현황을 확인하세요
            </p>
          </div>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
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
              <CheckCircle className="h-4 w-4 text-green-600" />
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
              <TrendingUp className="h-4 w-4 text-blue-600" />
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
      </div>
    </PageWrapper>
  )
}
