import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { TodoStatsContent } from './todo-stats-content'
import { getCurrentTenantId } from '@/lib/auth/helpers'

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

async function loadInitialStats(tenantId: string) {
  const supabase = await createClient()

  // Default: last week
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  const dateFilter = weekAgo.toISOString()

  // Load overall stats
  const { data: overallData } = await supabase
    .from('student_todos')
    .select('id, completed_at, verified_at, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', dateFilter)

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

  const overallStats: TodoStats = {
    totalTodos,
    completedTodos,
    verifiedTodos,
    pendingVerification,
    averageCompletionTime,
    completionRate,
  }

  // Load student stats
  const { data: studentData } = await supabase
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
    .eq('tenant_id', tenantId)
    .gte('created_at', dateFilter)

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

  const studentStats: StudentStats[] = Array.from(studentMap.values()).map(stats => ({
    ...stats,
    completionRate: stats.totalTodos > 0
      ? (stats.completedTodos / stats.totalTodos) * 100
      : 0,
  }))
  studentStats.sort((a, b) => b.completionRate - a.completionRate)

  // Load subject stats
  const { data: subjectData } = await supabase
    .from('student_todos')
    .select('id, subject, completed_at')
    .eq('tenant_id', tenantId)
    .not('subject', 'is', null)
    .gte('created_at', dateFilter)

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

  const subjectStats = Array.from(subjectMap.values()).map(stats => ({
    ...stats,
    completionRate: stats.totalTodos > 0
      ? (stats.completedTodos / stats.totalTodos) * 100
      : 0,
  }))
  subjectStats.sort((a, b) => b.totalTodos - a.totalTodos)

  return { overallStats, studentStats, subjectStats }
}

export default async function TodoStatsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.todoManagement

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 통계" description="학생별, 과목별 과제 완료 현황을 상세한 통계로 확인하고 분석할 수 있는 기능을 준비하고 있습니다." />
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 통계" reason="통계 시스템 업데이트가 진행 중입니다." />
  }

  // Get authenticated user and tenant
  const { tenantId } = await getCurrentTenantId()

  // Load initial data on server
  const { overallStats, studentStats, subjectStats } = await loadInitialStats(tenantId)

  return (
    <PageWrapper>
      <TodoStatsContent
        initialOverallStats={overallStats}
        initialStudentStats={studentStats}
        initialSubjectStats={subjectStats}
      />
    </PageWrapper>
  )
}
