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

import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DashboardData } from '@/core/types/dashboard'

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

    // 2. Create service_role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    const today = new Date().toISOString().split('T')[0]

    // 3. Fetch all dashboard data in parallel
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
    ] = await Promise.allSettled([
      // Stats
      fetchStats(supabase, tenantId, today),

      // Recent students (last 30 days)
      supabase
        .from('students')
        .select('id, users!inner(name), grade, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),

      // Today's sessions
      supabase
        .from('class_sessions')
        .select('id, classes!inner(name), scheduled_start, scheduled_end, status, users!instructor_id(name)')
        .eq('classes.tenant_id', tenantId)
        .gte('scheduled_start', `${today}T00:00:00`)
        .lte('scheduled_start', `${today}T23:59:59`)
        .order('scheduled_start', { ascending: true }),

      // Birthday students (this month)
      supabase
        .from('students')
        .select('id, users!inner(name, birthday), grade')
        .eq('tenant_id', tenantId)
        .not('users.birthday', 'is', null)
        .limit(100), // Get all, filter client-side for this month

      // Scheduled consultations (next 7 days)
      supabase
        .from('consultations')
        .select('id, guardians!inner(users!inner(name)), students!inner(users!inner(name)), scheduled_at, topic')
        .eq('guardians.tenant_id', tenantId)
        .gte('scheduled_at', today)
        .lte('scheduled_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10),

      // Student alerts - 실제 쿼리
      fetchStudentAlerts(supabase, tenantId, today),

      // Financial data (placeholder - needs payment system)
      Promise.resolve({ data: { currentMonthRevenue: 0, previousMonthRevenue: 0, unpaidTotal: 0, unpaidCount: 0 } }),

      // Class status
      supabase
        .from('classes')
        .select('id, name, capacity, users!inner(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(10),

      // Parents to contact (placeholder)
      Promise.resolve({ data: [] }),

      // Calendar events (placeholder)
      Promise.resolve({ data: [] }),

      // Activity logs
      supabase
        .from('student_activity_logs')
        .select('id, activity_type, description, created_at, students!inner(users!inner(name))')
        .eq('students.tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    // 4. Process results
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
      ? recentStudentsResult.value.data.map((s: any) => ({
          id: s.id,
          name: s.users?.name || 'Unknown',
          grade: s.grade || '',
          joinedAt: s.created_at,
        }))
      : []

    const todaySessions = todaySessionsResult.status === 'fulfilled' && todaySessionsResult.value.data
      ? todaySessionsResult.value.data.map((s: any) => ({
          id: s.id,
          class_name: s.classes?.name || 'Unknown',
          scheduled_start: s.scheduled_start,
          scheduled_end: s.scheduled_end,
          status: s.status,
          instructor_name: s.users?.name,
        }))
      : []

    // Filter birthday students for current month
    const currentMonth = new Date().getMonth()
    const birthdayStudents = birthdayStudentsResult.status === 'fulfilled' && birthdayStudentsResult.value.data
      ? birthdayStudentsResult.value.data
          .filter((s: any) => {
            if (!s.users?.birthday) return false
            const birthdayMonth = new Date(s.users.birthday).getMonth()
            return birthdayMonth === currentMonth
          })
          .map((s: any) => ({
            id: s.id,
            name: s.users?.name || 'Unknown',
            birthday: s.users?.birthday,
            grade: s.grade || '',
          }))
      : []

    const scheduledConsultations = scheduledConsultationsResult.status === 'fulfilled' && scheduledConsultationsResult.value.data
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
      : { longAbsence: [], pendingAssignments: [] }

    const financialData = financialDataResult.status === 'fulfilled' && financialDataResult.value.data
      ? financialDataResult.value.data
      : undefined

    const classStatus = classStatusResult.status === 'fulfilled' && classStatusResult.value.data
      ? classStatusResult.value.data.map((c: any) => ({
          id: c.id,
          class_name: c.name,
          enrolled: 0, // TODO: Count from enrollments
          capacity: c.capacity || 0,
          instructor: c.users?.name || 'Unknown',
          schedule: '', // TODO: Get from schedule
        }))
      : []

    const parentsToContact = parentsToContactResult.status === 'fulfilled' && parentsToContactResult.value.data
      ? parentsToContactResult.value.data
      : []

    const calendarEvents = calendarEventsResult.status === 'fulfilled' && calendarEventsResult.value.data
      ? calendarEventsResult.value.data
      : []

    const activityLogs = activityLogsResult.status === 'fulfilled' && activityLogsResult.value.data
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

    // 5. Return aggregated data
    const dashboardData: DashboardData = {
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
    }

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

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchStudentAlerts(supabase: any, tenantId: string, today: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // 1. 장기 결석자 - 최근 7일간 출석 기록이 없는 학생
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, users!inner(name), grade')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    const longAbsence: Array<{
      id: string
      name: string
      grade: string
      reason: string
      days: number
    }> = []
    if (allStudents && allStudents.length > 0) {
      for (const student of allStudents) {
        const { count } = await supabase
          .from('attendance_records')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .gte('attendance_date', sevenDaysAgo)
          .lte('attendance_date', today)

        if (count === 0) {
          longAbsence.push({
            id: student.id,
            name: student.users?.name || 'Unknown',
            grade: student.grade || '',
            reason: '최근 7일간 출석 기록 없음',
            days: 7,
          })
        }
      }
    }

    // 2. 미완료 과제가 많은 학생 - 미완료 과제 3개 이상
    const { data: studentsWithPendingTodos } = await supabase
      .from('student_todos')
      .select('student_id, students!inner(id, users!inner(name), grade)')
      .eq('students.tenant_id', tenantId)
      .is('completed_at', null)
      .is('verified_at', null)
      .is('deleted_at', null)

    const pendingAssignmentsMap = new Map<string, { name: string; grade: string; count: number }>()

    if (studentsWithPendingTodos) {
      studentsWithPendingTodos.forEach((todo: any) => {
        const studentId = todo.student_id
        const student = todo.students

        if (!pendingAssignmentsMap.has(studentId)) {
          pendingAssignmentsMap.set(studentId, {
            name: student?.users?.name || 'Unknown',
            grade: student?.grade || '',
            count: 0,
          })
        }

        const current = pendingAssignmentsMap.get(studentId)!
        current.count++
      })
    }

    const pendingAssignments: Array<{
      id: string
      name: string
      grade: string
      reason: string
    }> = Array.from(pendingAssignmentsMap.entries())
      .filter(([, data]) => data.count >= 3)
      .map(([id, data]) => ({
        id,
        name: data.name,
        grade: data.grade,
        reason: `미완료 과제 ${data.count}개`,
      }))
      .slice(0, 10) // 상위 10명만

    return {
      longAbsence: longAbsence.slice(0, 10), // 상위 10명만
      pendingAssignments,
    }
  } catch (error) {
    console.error('[fetchStudentAlerts] Error:', error)
    return {
      longAbsence: [],
      pendingAssignments: [],
    }
  }
}

async function fetchStats(supabase: any, tenantId: string, today: string) {
  // Date calculations
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    studentsCount,
    classesCount,
    todayAttendanceCount,
    pendingTodosCount,
    reportsCount,
    unsentReportsCount,
    // New: averageScore calculation
    avgScoreResult,
    // New: completionRate calculation
    completionRateResult,
    // Trend data
    previousMonthStudentsCount,
    previousWeekAttendanceCount,
    previousMonthAvgScoreResult,
    previousWeekCompletionRateResult,
    // Lead consultations data
    leadConsultationsCount,
    convertedConsultationsCount,
  ] = await Promise.allSettled([
    // Total students
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),

    // Active classes
    supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),

    // Today's attendance
    supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('attendance_date', today)
      .eq('status', 'present'),

    // Pending todos
    supabase
      .from('student_todos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('completed_at', null)
      .is('verified_at', null),

    // Total reports (placeholder)
    Promise.resolve({ count: 0 }),

    // Unsent reports (placeholder)
    Promise.resolve({ count: 0 }),

    // Average Score - 최근 30일 exam_scores 평균
    supabase
      .from('exam_scores')
      .select('percentage')
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null),

    // Completion Rate - 전체 todos의 완료율
    supabase
      .from('student_todos')
      .select('id, completed_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),

    // Previous month students (for trend)
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .lte('created_at', lastMonthEnd)
      .is('deleted_at', null),

    // Previous week attendance (for trend)
    supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('attendance_date', lastWeekStart)
      .lt('attendance_date', today)
      .eq('status', 'present'),

    // Previous month average score (for trend)
    supabase
      .from('exam_scores')
      .select('percentage')
      .eq('tenant_id', tenantId)
      .gte('created_at', lastMonthStart)
      .lte('created_at', lastMonthEnd)
      .is('deleted_at', null),

    // Previous week completion rate (for trend)
    supabase
      .from('student_todos')
      .select('id, completed_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', lastWeekStart)
      .lt('created_at', today)
      .is('deleted_at', null),

    // Lead consultations (신규 입회 상담 - 아직 전환 안 됨)
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_lead', true)
      .is('converted_to_student_id', null)
      .is('deleted_at', null),

    // Converted consultations (입회 완료)
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_lead', true)
      .not('converted_to_student_id', 'is', null)
      .is('deleted_at', null),
  ])

  // Calculate average score
  let averageScore = 0
  if (avgScoreResult.status === 'fulfilled' && avgScoreResult.value.data && avgScoreResult.value.data.length > 0) {
    const scores = avgScoreResult.value.data.map((s: any) => s.percentage || 0)
    averageScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
  }

  // Calculate completion rate
  let completionRate = 0
  if (completionRateResult.status === 'fulfilled' && completionRateResult.value.data) {
    const todos = completionRateResult.value.data
    const completedCount = todos.filter((t: any) => t.completed_at !== null).length
    completionRate = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0
  }

  // Calculate previous month average score
  let previousMonthAvgScore = 0
  if (previousMonthAvgScoreResult.status === 'fulfilled' && previousMonthAvgScoreResult.value.data && previousMonthAvgScoreResult.value.data.length > 0) {
    const scores = previousMonthAvgScoreResult.value.data.map((s: any) => s.percentage || 0)
    previousMonthAvgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
  }

  // Calculate previous week completion rate
  let previousWeekCompletionRate = 0
  if (previousWeekCompletionRateResult.status === 'fulfilled' && previousWeekCompletionRateResult.value.data) {
    const todos = previousWeekCompletionRateResult.value.data
    const completedCount = todos.filter((t: any) => t.completed_at !== null).length
    previousWeekCompletionRate = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0
  }

  // Extract lead consultation counts
  const leadConsultations = leadConsultationsCount.status === 'fulfilled' ? (leadConsultationsCount.value.count || 0) : 0
  const convertedConsultations = convertedConsultationsCount.status === 'fulfilled' ? (convertedConsultationsCount.value.count || 0) : 0

  // Calculate conversion rate (입회율)
  const totalLeadConsultations = leadConsultations + convertedConsultations
  const conversionRate = totalLeadConsultations > 0
    ? Math.round((convertedConsultations / totalLeadConsultations) * 100)
    : 0

  return {
    totalStudents: studentsCount.status === 'fulfilled' ? (studentsCount.value.count || 0) : 0,
    activeClasses: classesCount.status === 'fulfilled' ? (classesCount.value.count || 0) : 0,
    todayAttendance: todayAttendanceCount.status === 'fulfilled' ? (todayAttendanceCount.value.count || 0) : 0,
    pendingTodos: pendingTodosCount.status === 'fulfilled' ? (pendingTodosCount.value.count || 0) : 0,
    totalReports: reportsCount.status === 'fulfilled' ? (reportsCount.value.count || 0) : 0,
    unsentReports: unsentReportsCount.status === 'fulfilled' ? (unsentReportsCount.value.count || 0) : 0,
    averageScore,
    completionRate,
    previousMonthStudents: previousMonthStudentsCount.status === 'fulfilled' ? (previousMonthStudentsCount.value.count || 0) : undefined,
    previousWeekAttendance: previousWeekAttendanceCount.status === 'fulfilled' ? (previousWeekAttendanceCount.value.count || 0) : undefined,
    previousMonthAvgScore,
    previousWeekCompletionRate,
    leadConsultations,
    convertedConsultations,
    conversionRate,
  }
}
