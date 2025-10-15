import { PageWrapper } from "@/components/layout/page-wrapper"
import { DashboardClient } from './dashboard-client'
import { getCurrentTenantId } from '@/lib/auth-helpers'
import { logError } from '@/lib/error-handlers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "대시보드",
  description: "학원 운영 현황을 한눈에 확인하세요. 실시간 통계, 오늘의 할 일, 학생 현황을 대시보드에서 관리하세요.",
}

export default async function DashboardPage() {
  // 인증 확인 및 tenant_id 조회 (getCurrentTenantId는 자체적으로 인증을 확인하고 리다이렉트)
  const { supabase } = await getCurrentTenantId()

  const today = new Date().toISOString().split('T')[0]

  // Single RPC call to fetch all dashboard data
  const { data, error } = await supabase.rpc('get_dashboard_data', {
    today_param: today
  })

  if (error) {
    logError(error, {
      page: 'dashboard',
      rpc: 'get_dashboard_data',
      today_param: today,
    })
  }

  // Fetch recent activity logs
  const { data: activityLogs, error: activityError } = await supabase
    .from('student_activity_logs')
    .select(`
      id,
      activity_type,
      description,
      created_at,
      students (
        users (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (activityError) {
    logError(activityError, {
      page: 'dashboard',
      query: 'student_activity_logs',
    })
  }

  const dashboardData = data || {
    stats: {
      totalStudents: 0,
      activeClasses: 0,
      todayAttendance: 0,
      pendingTodos: 0,
      totalReports: 0,
      unsentReports: 0,
    },
    recentStudents: [],
    todaySessions: [],
    birthdayStudents: [],
    scheduledConsultations: [],
    studentAlerts: {
      longAbsence: [],
      pendingAssignments: [],
    },
    financialData: {
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
      unpaidTotal: 0,
      unpaidCount: 0,
    },
    classStatus: [],
    parentsToContact: [],
    calendarEvents: [],
    activityLogs: activityLogs || [],
  }

  return (
    <PageWrapper>
      <DashboardClient data={dashboardData} />
    </PageWrapper>
  )
}
