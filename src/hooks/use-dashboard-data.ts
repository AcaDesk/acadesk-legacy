/**
 * useDashboardData Hook
 *
 * Fetches dashboard data using Server Actions
 *
 * ✅ React Query 기반으로 리팩토링됨:
 * - 자동 캐싱 (1분)
 * - 백그라운드 refetch
 * - 에러 재시도
 *
 * TODO: Server Action 연동 후 실제 데이터 반환으로 변경
 */

'use client'

import { useQuery } from '@tanstack/react-query'

// Re-export types from core for convenience
export type {
  TodaySession,
  RecentStudent,
  BirthdayStudent,
  StudentAlert,
  ActivityLog,
  CalendarEvent,
  ClassStatus,
  DashboardData,
  ScheduledConsultation,
  ParentToContact,
} from '@/core/types/dashboard'

export interface DashboardDataCompat {
  stats: {
    totalStudents: number
    activeClasses: number
    todayAttendance: number
    pendingTodos: number
  }
  recentStudents: any[]
  todaySessions: any[]
  birthdayStudents: any[]
  scheduledConsultations: any[]
  studentAlerts: {
    longAbsence: any[]
    pendingAssignments: any[]
  }
  financialData: {
    currentMonthRevenue: number
    previousMonthRevenue: number
    unpaidTotal: number
    unpaidCount: number
  }
  classStatus: any[]
  parentsToContact: any[]
  calendarEvents: any[]
  activityLogs: any[]
}

export interface UseDashboardDataReturn {
  data: DashboardDataCompat | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Query key for dashboard data
 */
export const DASHBOARD_DATA_QUERY_KEY = ['dashboardData']

/**
 * Default empty dashboard data
 */
const EMPTY_DASHBOARD_DATA: DashboardDataCompat = {
  stats: {
    totalStudents: 0,
    activeClasses: 0,
    todayAttendance: 0,
    pendingTodos: 0,
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

/**
 * Fetch dashboard data from Server Action
 */
async function fetchDashboardData(): Promise<DashboardDataCompat> {
  // TODO: Call Server Action instead of returning mock data
  // const result = await getDashboardData()
  // if (!result.success) throw new Error(result.error)
  // return result.data

  // For now, return empty data (placeholder)
  return EMPTY_DASHBOARD_DATA
}

export function useDashboardData(): UseDashboardDataReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: DASHBOARD_DATA_QUERY_KEY,
    queryFn: fetchDashboardData,
    staleTime: 60 * 1000,       // 1분간 캐시 유지
    gcTime: 5 * 60 * 1000,      // 5분간 가비지 컬렉션 대기
    refetchOnWindowFocus: true, // 창 포커스 시 자동 refetch
    refetchInterval: 5 * 60 * 1000, // 5분마다 자동 refetch
    retry: 1,
  })

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch: async () => { await refetch() },
  }
}
