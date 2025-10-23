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
        .select('id, classes!inner(name), scheduled_start, scheduled_end, status, users(name)')
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

      // Student alerts (placeholder - needs custom logic)
      Promise.resolve({ data: { longAbsence: [], pendingAssignments: [] } }),

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

    const studentAlerts = studentAlertsResult.status === 'fulfilled' && studentAlertsResult.value.data
      ? studentAlertsResult.value.data
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

async function fetchStats(supabase: any, tenantId: string, today: string) {
  const [
    studentsCount,
    classesCount,
    todayAttendanceCount,
    pendingTodosCount,
    reportsCount,
    unsentReportsCount,
  ] = await Promise.allSettled([
    // Total students
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

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
  ])

  return {
    totalStudents: studentsCount.status === 'fulfilled' ? (studentsCount.value.count || 0) : 0,
    activeClasses: classesCount.status === 'fulfilled' ? (classesCount.value.count || 0) : 0,
    todayAttendance: todayAttendanceCount.status === 'fulfilled' ? (todayAttendanceCount.value.count || 0) : 0,
    pendingTodos: pendingTodosCount.status === 'fulfilled' ? (pendingTodosCount.value.count || 0) : 0,
    totalReports: reportsCount.status === 'fulfilled' ? (reportsCount.value.count || 0) : 0,
    unsentReports: unsentReportsCount.status === 'fulfilled' ? (unsentReportsCount.value.count || 0) : 0,
  }
}
