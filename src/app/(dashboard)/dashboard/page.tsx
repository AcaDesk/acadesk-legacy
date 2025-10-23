import { PageWrapper } from "@/components/layout/page-wrapper"
import { DashboardClient } from './dashboard-client'
import { getDashboardData } from '@/app/actions/dashboard'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'
import type { DashboardData } from '@/core/types/dashboard'

export const metadata: Metadata = {
  title: "대시보드",
  description: "학원 운영 현황을 한눈에 확인하세요. 실시간 통계, 오늘의 할 일, 학생 현황을 대시보드에서 관리하세요.",
}

/**
 * Dashboard Page (Server Component)
 *
 * ✅ 역할:
 * - 인증 확인 (layout에서 이미 했지만 명시적 재확인)
 * - 대시보드 데이터 병렬 로드
 * - 클라이언트 컴포넌트로 데이터 전달
 *
 * ❌ 하지 않음:
 * - UI 상태 관리 (DnD, 위젯 정렬 등)
 * - 클라이언트 인터랙션
 */
export default async function DashboardPage() {
  // 1. 인증 확인 (명시적 체크 - layout에서 이미 했지만 방어적 프로그래밍)
  await requireAuth()

  // 2. 대시보드 데이터 로드 (Server Action - service_role 기반)
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
          averageScore: 0,
          completionRate: 0,
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
