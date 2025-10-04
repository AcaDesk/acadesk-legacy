import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Single RPC call to fetch all dashboard data
  const { data, error } = await supabase.rpc('get_dashboard_data', {
    today_param: today
  })

  if (error) {
    console.error('Dashboard data fetch error:', error)
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
  }

  return (
    <PageWrapper>
      <DashboardClient data={dashboardData} />
    </PageWrapper>
  )
}
