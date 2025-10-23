import { PageWrapper } from "@/components/layout/page-wrapper"
import { DashboardClient } from './dashboard-client'
import { getDashboardData } from '@/app/actions/dashboard'
import type { Metadata } from 'next'
import type { DashboardData } from '@/core/types/dashboard'

export const metadata: Metadata = {
  title: "대시보드",
  description: "학원 운영 현황을 한눈에 확인하세요. 실시간 통계, 오늘의 할 일, 학생 현황을 대시보드에서 관리하세요.",
}

export default async function DashboardPage() {
  // Fetch all dashboard data via Server Action (service_role based, bypasses RLS)
  const result = await getDashboardData()

  // Fallback to empty data if error
  const dashboardData: DashboardData = result.success && result.data
    ? result.data
    : {
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
        activityLogs: [],
      }

  return (
    <PageWrapper>
      <DashboardClient data={dashboardData} />
    </PageWrapper>
  )
}
