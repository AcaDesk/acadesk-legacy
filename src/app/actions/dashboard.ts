/**
 * Dashboard Data Server Actions
 *
 * ✅ Service Role 기반 (RPC 대체 완료)
 *
 * service_role 기반으로 대시보드 데이터를 조회합니다.
 * RLS를 우회하여 테넌트별 데이터에 직접 접근합니다.
 *
 * ⚠️ 모든 쿼리는 tenant_id로 필터링되어야 합니다.
 */

'use server'

import { unstable_cache } from 'next/cache'
import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayKST } from '@/lib/utils'
import { computeStudentRisk } from '@/lib/risk-score'
import type { DashboardData, RiskStudentAlert, WeeklyPerformanceData } from '@/core/types/dashboard'

// ============================================================================
// Types
// ============================================================================

export interface DashboardDataResult {
  success: boolean
  error?: string
  data?: DashboardData
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 대시보드 데이터 조회
 *
 * ✅ Service Role 기반 구현
 *
 * Workflow:
 * 1. Verifies staff permission and gets tenant_id
 * 2. Uses service_role to query all dashboard data (bypasses RLS)
 * 3. ⚠️ All queries are filtered by tenant_id for multi-tenant security
 * 4. Returns aggregated dashboard data
 */
export async function getDashboardData(): Promise<DashboardDataResult> {
  const requestId = crypto.randomUUID()

  try {
    console.log('[getDashboardData] Request started:', { requestId })

    // 1. Verify staff permission and get tenant_id
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    const { tenant_id: tenantId } = permissionResult.data

    const today = getTodayKST()
    const dashboardData = await getCachedDashboardPayload(tenantId, today)

    console.log('[getDashboardData] Request completed:', {
      requestId,
      tenantId,
      dataKeys: Object.keys(dashboardData),
    })

    return {
      success: true,
      data: dashboardData,
    }
  } catch (error) {
    console.error('[getDashboardData] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: '대시보드 데이터 조회 중 오류가 발생했습니다.' }
  }
}

const getCachedDashboardPayload = unstable_cache(
  async (tenantId: string, today: string): Promise<DashboardData> => {
    const supabase = createServiceRoleClient()

    const [todayYear, todayMonth] = today.split('-').map(Number)
    const currentMonthStart = `${todayYear}-${String(todayMonth).padStart(2, '0')}-01`
    const nextMonth = todayMonth === 12 ? 1 : todayMonth + 1
    const nextYear = todayMonth === 12 ? todayYear + 1 : todayYear
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const [
      statsResult,
      recentStudentsResult,
      todaySessionsResult,
      birthdayStudentsResult,
      scheduledConsultationsResult,
      studentAlertsResult,
      financialDataResult,
      classStatusResult,
      parentsToContactResult,
      calendarEventsResult,
      activityLogsResult,
      weeklyPerformanceResult,
      classEnrollmentsResult,
    ] = await Promise.allSettled([
      fetchStats(supabase, tenantId, today),
      supabase
        .from('students')
        .select('id, users!inner(name), grade, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('class_sessions')
        .select('id, classes!inner(name), scheduled_start, scheduled_end, status, users!instructor_id(name)')
        .eq('classes.tenant_id', tenantId)
        .gte('scheduled_start', `${today}T00:00:00`)
        .lte('scheduled_start', `${today}T23:59:59`)
        .order('scheduled_start', { ascending: true }),
      supabase
        .from('students')
        .select('id, users!inner(name, birthday), grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('users.birthday', 'is', null),
      supabase
        .from('consultations')
        .select('id, guardians!inner(users!inner(name)), students!inner(users!inner(name)), scheduled_at, topic')
        .eq('guardians.tenant_id', tenantId)
        .gte('scheduled_at', today)
        .lte('scheduled_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10),
      fetchStudentAlerts(supabase, tenantId, today),
      Promise.resolve({ data: { currentMonthRevenue: 0, previousMonthRevenue: 0, unpaidTotal: 0, unpaidCount: 0 } }),
      supabase
        .from('classes')
        .select('id, name, capacity, users!inner(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(10),
      Promise.resolve({ data: [] }),
      supabase
        .from('calendar_events')
        .select('id, title, event_type, start_at, end_at')
        .eq('tenant_id', tenantId)
        .gte('start_at', currentMonthStart)
        .lt('start_at', nextMonthStart)
        .is('deleted_at', null)
        .order('start_at', { ascending: true }),
      supabase
        .from('student_activity_logs')
        .select('id, activity_type, description, created_at, students!inner(users!inner(name))')
        .eq('students.tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
      fetchWeeklyPerformance(supabase, tenantId, today),
      supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .is('deleted_at', null),
    ])

    const stats = statsResult.status === 'fulfilled' ? statsResult.value : {
      totalStudents: 0,
      activeClasses: 0,
      todayAttendance: 0,
      pendingTodos: 0,
      totalReports: 0,
      unsentReports: 0,
      averageScore: 0,
      completionRate: 0,
    }

    const recentStudents = recentStudentsResult.status === 'fulfilled' && recentStudentsResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? recentStudentsResult.value.data.map((s: any) => ({
          id: s.id,
          name: s.users?.name || 'Unknown',
          grade: s.grade || '',
          joinedAt: s.created_at,
        }))
      : []

    const todaySessions = todaySessionsResult.status === 'fulfilled' && todaySessionsResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? todaySessionsResult.value.data.map((s: any) => ({
          id: s.id,
          class_name: s.classes?.name || 'Unknown',
          scheduled_start: s.scheduled_start,
          scheduled_end: s.scheduled_end,
          status: s.status,
          instructor_name: s.users?.name,
        }))
      : []

    const currentMonthNum = parseInt(today.split('-')[1], 10)
    const birthdayStudents = birthdayStudentsResult.status === 'fulfilled' && birthdayStudentsResult.value.data
      ? birthdayStudentsResult.value.data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => {
            if (!s.users?.birthday) return false
            const birthdayMonth = parseInt(s.users.birthday.split('-')[1], 10)
            return birthdayMonth === currentMonthNum
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => ({
            id: s.id,
            name: s.users?.name || 'Unknown',
            birthday: s.users?.birthday,
            grade: s.grade || '',
          }))
      : []

    const scheduledConsultations = scheduledConsultationsResult.status === 'fulfilled' && scheduledConsultationsResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? scheduledConsultationsResult.value.data.map((c: any) => ({
          id: c.id,
          parent_name: c.guardians?.users?.name || 'Unknown',
          student_name: c.students?.users?.name || 'Unknown',
          scheduled_at: c.scheduled_at,
          topic: c.topic || '',
        }))
      : []

    const studentAlerts = studentAlertsResult.status === 'fulfilled' && studentAlertsResult.value
      ? studentAlertsResult.value
      : { atRisk: [] }

    const financialData = financialDataResult.status === 'fulfilled' && financialDataResult.value.data
      ? financialDataResult.value.data
      : undefined

    const enrollmentCountsByClass = new Map<string, number>()
    if (classEnrollmentsResult.status === 'fulfilled' && classEnrollmentsResult.value.data) {
      for (const enrollment of classEnrollmentsResult.value.data as { class_id: string }[]) {
        const classId = enrollment.class_id
        enrollmentCountsByClass.set(classId, (enrollmentCountsByClass.get(classId) || 0) + 1)
      }
    }

    const classStatus = classStatusResult.status === 'fulfilled' && classStatusResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? classStatusResult.value.data.map((c: any) => {
          const enrolledCount = enrollmentCountsByClass.get(c.id) || 0
          return {
            id: c.id,
            class_name: c.name,
            name: c.name,
            enrolled: enrolledCount,
            capacity: c.capacity || 0,
            student_count: enrolledCount,
            active_students: enrolledCount,
            status: 'active' as const,
            instructor: c.users?.name || 'Unknown',
            schedule: '',
          }
        })
      : []

    const parentsToContact = parentsToContactResult.status === 'fulfilled' && parentsToContactResult.value.data
      ? parentsToContactResult.value.data
      : []

    const calendarEvents = calendarEventsResult.status === 'fulfilled' && calendarEventsResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? calendarEventsResult.value.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.start_at,
          type: e.event_type || 'event',
          start_date: e.start_at,
          event_type: e.event_type || 'event',
        }))
      : []

    const activityLogs = activityLogsResult.status === 'fulfilled' && activityLogsResult.value.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? activityLogsResult.value.data.map((log: any) => ({
          id: log.id,
          activity_type: log.activity_type,
          description: log.description,
          created_at: log.created_at,
          students: {
            users: {
              name: log.students?.users?.name || 'Unknown',
            },
          },
        }))
      : []

    const weeklyPerformance = weeklyPerformanceResult.status === 'fulfilled'
      ? weeklyPerformanceResult.value
      : undefined

    return {
      stats,
      recentStudents,
      todaySessions,
      birthdayStudents,
      scheduledConsultations,
      studentAlerts,
      financialData,
      classStatus,
      parentsToContact,
      calendarEvents,
      activityLogs,
      weeklyPerformance,
    }
  },
  ['dashboard-data-v2'],
  { revalidate: 300 }
)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 위험 학생 조기 경보 — 규칙 기반 복합 스코어링
 *
 * 최근 28일 vs 이전 28일을 비교해 출결 변화 + 성적 하락 + 과제 미제출을
 * 합산 점수로 평가한다. 점수 5+ → 위험, 3~4 → 주의.
 */
async function fetchStudentAlerts(supabase: ReturnType<typeof createServiceRoleClient>, tenantId: string, today: string) {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentStart = daysAgo(27)
  const prevStart = daysAgo(55)
  const prevEnd = daysAgo(28)
  const sevenDaysAgo = daysAgo(7)

  try {
    const [studentsResult, attendanceResult, pendingTodosResult, examsResult] = await Promise.all([
      supabase
        .from('students')
        .select('id, users!inner(name), grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      supabase
        .from('attendance')
        .select('student_id, attendance_date, status')
        .eq('tenant_id', tenantId)
        .gte('attendance_date', prevStart)
        .lte('attendance_date', today),
      supabase
        .from('student_todos')
        .select('student_id')
        .eq('tenant_id', tenantId)
        .is('completed_at', null)
        .is('verified_at', null)
        .is('deleted_at', null),
      supabase
        .from('exams')
        .select('id, exam_date')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('exam_date', prevStart)
        .lte('exam_date', today),
    ])

    const allStudents = studentsResult.data || []
    const attendanceRows = (attendanceResult.data || []) as Array<{
      student_id: string
      attendance_date: string
      status: string
    }>

    // 시험 점수 (해당 기간 시험이 있을 때만 조회)
    const exams = (examsResult.data || []) as Array<{ id: string; exam_date: string }>
    const examDateById = new Map(exams.map((e) => [e.id, e.exam_date]))
    let scoreRows: Array<{
      student_id: string
      exam_id: string
      percentage: number | null
      score: number | null
      total_points: number | null
    }> = []
    if (exams.length > 0) {
      const { data } = await supabase
        .from('exam_scores')
        .select('student_id, exam_id, percentage, score, total_points')
        .eq('tenant_id', tenantId)
        .in('exam_id', exams.map((e) => e.id))
        .is('deleted_at', null)
      scoreRows = (data || []) as typeof scoreRows
    }

    // ---- 학생별 신호 집계 ----
    interface Window { present: number; late: number; absent: number; total: number }
    const emptyWindow = (): Window => ({ present: 0, late: 0, absent: 0, total: 0 })
    const attendanceByStudent = new Map<string, { recent: Window; prev: Window; hasLast7d: boolean; hasAny: boolean }>()

    for (const row of attendanceRows) {
      let entry = attendanceByStudent.get(row.student_id)
      if (!entry) {
        entry = { recent: emptyWindow(), prev: emptyWindow(), hasLast7d: false, hasAny: false }
        attendanceByStudent.set(row.student_id, entry)
      }
      entry.hasAny = true
      if (row.attendance_date >= sevenDaysAgo) entry.hasLast7d = true

      const window =
        row.attendance_date >= recentStart
          ? entry.recent
          : row.attendance_date <= prevEnd
            ? entry.prev
            : null
      if (!window) continue
      window.total++
      if (row.status === 'present') window.present++
      else if (row.status === 'late' || row.status === 'left_early') window.late++
      else if (row.status === 'absent') window.absent++
    }

    const pendingCountByStudent = new Map<string, number>()
    for (const row of (pendingTodosResult.data || []) as Array<{ student_id: string }>) {
      pendingCountByStudent.set(row.student_id, (pendingCountByStudent.get(row.student_id) ?? 0) + 1)
    }

    const scoresByStudent = new Map<string, { recent: number[]; prev: number[] }>()
    for (const row of scoreRows) {
      const examDate = examDateById.get(row.exam_id)
      if (!examDate) continue
      const percentage =
        row.percentage ??
        (row.score !== null && row.total_points ? (row.score / row.total_points) * 100 : null)
      if (percentage === null) continue

      let entry = scoresByStudent.get(row.student_id)
      if (!entry) {
        entry = { recent: [], prev: [] }
        scoresByStudent.set(row.student_id, entry)
      }
      if (examDate >= recentStart) entry.recent.push(percentage)
      else entry.prev.push(percentage)
    }

    // ---- 스코어링 (규칙은 lib/risk-score.ts에 집중) ----
    const atRisk: RiskStudentAlert[] = []

    for (const student of allStudents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = student as any

      const assessment = computeStudentRisk({
        attendance: attendanceByStudent.get(s.id),
        scores: scoresByStudent.get(s.id),
        pendingTodoCount: pendingCountByStudent.get(s.id) ?? 0,
      })

      if (assessment) {
        atRisk.push({
          id: s.id,
          name: s.users?.name || '이름 없음',
          grade: s.grade || '',
          level: assessment.level,
          score: assessment.score,
          reasons: assessment.reasons,
        })
      }
    }

    atRisk.sort((a, b) => b.score - a.score)

    return { atRisk: atRisk.slice(0, 12) }
  } catch (error) {
    console.error('[fetchStudentAlerts] Error:', error)
    return { atRisk: [] }
  }
}

async function fetchWeeklyPerformance(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  today: string
): Promise<WeeklyPerformanceData> {
  try {
    // Calculate this week's Monday (KST)
    const todayDate = new Date(today + 'T00:00:00+09:00')
    const dayOfWeek = todayDate.getDay() // 0=Sun, 1=Mon, ...
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0=Mon, ..., 6=Sun

    const weekStartDate = new Date(todayDate)
    weekStartDate.setDate(weekStartDate.getDate() - adjustedDay)

    // Generate all 7 dates (Mon-Sun)
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate)
      d.setDate(d.getDate() + i)
      weekDates.push(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }))
    }

    const weekStart = weekDates[0]
    const weekEnd = weekDates[6]

    const [attendanceResult, todosResult] = await Promise.all([
      supabase
        .from('attendance')
        .select('attendance_date, status')
        .eq('tenant_id', tenantId)
        .gte('attendance_date', weekStart)
        .lte('attendance_date', weekEnd),
      supabase
        .from('student_todos')
        .select('completed_at')
        .eq('tenant_id', tenantId)
        .not('completed_at', 'is', null)
        .gte('completed_at', weekStart + 'T00:00:00+09:00')
        .lte('completed_at', weekEnd + 'T23:59:59+09:00'),
    ])

    // Group attendance by date
    const attendanceByDate = new Map<string, { present: number; total: number }>()
    if (attendanceResult.data) {
      for (const record of attendanceResult.data as { attendance_date: string; status: string }[]) {
        const date = record.attendance_date
        if (!attendanceByDate.has(date)) {
          attendanceByDate.set(date, { present: 0, total: 0 })
        }
        const entry = attendanceByDate.get(date)!
        entry.total++
        if (record.status === 'present' || record.status === 'late') {
          entry.present++
        }
      }
    }

    // Group todo completions by date (KST)
    const todosByDate = new Map<string, number>()
    if (todosResult.data) {
      for (const todo of todosResult.data as { completed_at: string }[]) {
        const date = new Date(todo.completed_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
        todosByDate.set(date, (todosByDate.get(date) || 0) + 1)
      }
    }

    // Build arrays indexed by weekday (Mon=0, ..., Sun=6)
    const attendance: number[] = []
    const todos: number[] = []
    const reports: number[] = [] // placeholder - no reports table yet

    for (const date of weekDates) {
      const att = attendanceByDate.get(date)
      attendance.push(att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0)
      todos.push(todosByDate.get(date) || 0)
      reports.push(0)
    }

    return { attendance, todos, reports }
  } catch (error) {
    console.error('[fetchWeeklyPerformance] Error:', error)
    return { attendance: [0, 0, 0, 0, 0, 0, 0], todos: [0, 0, 0, 0, 0, 0, 0], reports: [0, 0, 0, 0, 0, 0, 0] }
  }
}

async function fetchStats(supabase: ReturnType<typeof createServiceRoleClient>, tenantId: string, today: string) {
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', {
      p_tenant_id: tenantId,
      p_today: today,
    })
    .single()

  if (error) {
    throw error
  }

  const stats = (data || {}) as {
    total_students?: number
    active_classes?: number
    today_attendance?: number
    pending_todos?: number
    average_score?: number
    completion_rate?: number
    previous_month_students?: number
    previous_week_attendance?: number
    previous_month_avg_score?: number
    previous_week_completion_rate?: number
    lead_consultations?: number
    converted_consultations?: number
  }

  const leadConsultations = stats.lead_consultations || 0
  const convertedConsultations = stats.converted_consultations || 0
  const totalLeadConsultations = leadConsultations + convertedConsultations
  const conversionRate = totalLeadConsultations > 0
    ? Math.round((convertedConsultations / totalLeadConsultations) * 100)
    : 0

  return {
    totalStudents: stats.total_students || 0,
    activeClasses: stats.active_classes || 0,
    todayAttendance: stats.today_attendance || 0,
    pendingTodos: stats.pending_todos || 0,
    totalReports: 0,
    unsentReports: 0,
    averageScore: Math.round(stats.average_score || 0),
    completionRate: Math.round(stats.completion_rate || 0),
    previousMonthStudents: stats.previous_month_students || 0,
    previousWeekAttendance: stats.previous_week_attendance || 0,
    previousMonthAvgScore: Math.round(stats.previous_month_avg_score || 0),
    previousWeekCompletionRate: Math.round(stats.previous_week_completion_rate || 0),
    leadConsultations,
    convertedConsultations,
    conversionRate,
  }
}

// ============================================================================
// Widget Server Actions (dashboard async widgets)
// ============================================================================

export interface QuickStudentStats {
  totalStudents: number
  newStudents: number
}

/**
 * 대시보드 빠른 통계 위젯용 학생 카운트
 * Replaces the cookie-client query in `quick-stats-async.tsx` (broken by RLS migration).
 */
export async function getQuickStudentStats(): Promise<{
  success: boolean
  data: QuickStudentStats
  error: string | null
}> {
  const fallback: QuickStudentStats = { totalStudents: 0, newStudents: 0 }
  try {
    const auth = await verifyStaffPermission()
    if (!auth.success || !auth.data) {
      return { success: false, data: fallback, error: auth.error || '권한이 없습니다' }
    }

    const serviceClient = createServiceRoleClient()
    const tenantId = auth.data.tenant_id
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ count: totalStudents }, { count: newStudents }] = await Promise.all([
      serviceClient
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      serviceClient
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('enrollment_date', oneWeekAgo)
        .is('deleted_at', null),
    ])

    return {
      success: true,
      data: {
        totalStudents: totalStudents ?? 0,
        newStudents: newStudents ?? 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getQuickStudentStats] Error:', error)
    return {
      success: false,
      data: fallback,
      error: error instanceof Error ? error.message : '통계 조회 실패',
    }
  }
}

export interface RecentStudent {
  id: string
  enrollment_date: string
  users: { name: string } | null
  ref_grade_levels: { grade_level_name: string } | null
  student_guardians: Array<{
    guardians: {
      relationship: string | null
      users: { name: string } | null
    } | null
  }>
}

/**
 * 최근 등록 학생 목록 (대시보드 위젯)
 * Replaces the cookie-client query in `recent-students-card-async.tsx`.
 */
export async function getRecentStudents(limit = 5): Promise<{
  success: boolean
  data: RecentStudent[]
  error: string | null
}> {
  try {
    const auth = await verifyStaffPermission()
    if (!auth.success || !auth.data) {
      return { success: false, data: [], error: auth.error || '권한이 없습니다' }
    }

    const serviceClient = createServiceRoleClient()
    const tenantId = auth.data.tenant_id

    const { data, error } = await serviceClient
      .from('students')
      .select(`
        id,
        enrollment_date,
        users (
          name
        ),
        ref_grade_levels (
          grade_level_name
        ),
        student_guardians (
          guardians (
            relationship,
            users (
              name
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('enrollment_date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: (data || []) as unknown as RecentStudent[],
      error: null,
    }
  } catch (error) {
    console.error('[getRecentStudents] Error:', error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : '최근 학생 조회 실패',
    }
  }
}
