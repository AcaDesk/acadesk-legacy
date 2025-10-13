import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface DashboardData {
  stats: {
    totalStudents: number
    activeClasses: number
    todayAttendance: number
    pendingTodos: number
    totalReports: number
    unsentReports: number
  }
  recentStudents: any[]
  todaySessions: any[]
  birthdayStudents: any[]
  scheduledConsultations: any[]
  studentAlerts: {
    longAbsence: any[]
    pendingAssignments: any[]
  }
  financialData?: {
    currentMonthRevenue: number
    previousMonthRevenue: number
    unpaidTotal: number
    unpaidCount: number
  }
  classStatus?: any[]
  parentsToContact?: any[]
  calendarEvents?: any[]
  activityLogs?: any[]
}

async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('get_dashboard_data', {
    today_param: today
  })

  if (error) {
    console.error('Dashboard data fetch error:', error)
    throw error
  }

  return data || getDefaultDashboardData()
}

function getDefaultDashboardData(): DashboardData {
  return {
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
}

export function useDashboardData(initialData?: DashboardData) {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    initialData,
    refetchInterval: 30000, // 30초마다 자동 새로고침
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10초 후 stale 처리
  })
}

// 수동 새로고침을 위한 유틸리티
export function useRefreshDashboard() {
  const { refetch } = useDashboardData()
  return refetch
}