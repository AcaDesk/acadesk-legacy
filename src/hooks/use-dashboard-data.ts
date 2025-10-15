import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Dashboard data type definitions
export interface RecentStudent {
  id: string
  name: string
  grade_level?: string
  enrollment_date: string
  guardian_name?: string
}

export interface TodaySession {
  id: string
  class_id: string
  class_name: string
  scheduled_start: string
  scheduled_end: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  attendance_count?: number
  total_students?: number
}

export interface BirthdayStudent {
  id: string
  name: string
  birth_date: string
  grade_level?: string
  guardian_phone?: string
}

export interface ScheduledConsultation {
  id: string
  student_id: string
  student_name: string
  guardian_name: string
  scheduled_date: string
  scheduled_time: string
  topic?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface StudentAlert {
  id: string
  student_id: string
  student_name: string
  alert_type: 'absence' | 'pending_assignment' | 'low_score'
  description: string
  created_at: string
}

export interface ClassStatus {
  id: string
  name: string
  student_count: number
  active_students: number
  attendance_rate?: number
  status: 'active' | 'inactive'
}

export interface ParentToContact {
  id: string
  guardian_id: string
  guardian_name: string
  student_name: string
  phone: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface CalendarEvent {
  id: string
  title: string
  start_date: string
  end_date: string
  event_type: 'class' | 'consultation' | 'exam' | 'other'
  description?: string
}

export interface ActivityLog {
  id: string
  student_id: string
  activity_type_code: string
  description: string
  created_at: string
  students: {
    name: string
  }
  ref_activity_types: {
    name_ko: string
    icon: string
  }
}

export interface DashboardData {
  stats: {
    totalStudents: number
    activeClasses: number
    todayAttendance: number
    pendingTodos: number
    totalReports: number
    unsentReports: number
  }
  recentStudents: RecentStudent[]
  todaySessions: TodaySession[]
  birthdayStudents: BirthdayStudent[]
  scheduledConsultations: ScheduledConsultation[]
  studentAlerts: {
    longAbsence: StudentAlert[]
    pendingAssignments: StudentAlert[]
  }
  financialData?: {
    currentMonthRevenue: number
    previousMonthRevenue: number
    unpaidTotal: number
    unpaidCount: number
  }
  classStatus?: ClassStatus[]
  parentsToContact?: ParentToContact[]
  calendarEvents?: CalendarEvent[]
  activityLogs?: ActivityLog[]
}

async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createClient()

  // 인증 확인
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn('Dashboard data fetch skipped: No active session')
    return getDefaultDashboardData()
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('get_dashboard_data', {
    today_param: today
  })

  if (error) {
    console.error('Dashboard data fetch error:', error)
    // 404는 RPC 함수가 없거나 권한이 없는 경우 (조용히 기본값 반환)
    if (error.code === 'PGRST116' || error.message.includes('404')) {
      console.warn('Dashboard RPC not available, returning default data')
      return getDefaultDashboardData()
    }
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
  const pathname = usePathname()

  // 대시보드 경로인지 확인 (정확히 /dashboard 또는 /dashboard/로 시작)
  const isDashboardRoute = pathname === '/dashboard' || pathname?.startsWith('/dashboard/')

  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    initialData,
    // 대시보드 페이지에서만 쿼리 활성화
    enabled: isDashboardRoute,
    refetchInterval: isDashboardRoute ? 30000 : false, // 30초마다 자동 새로고침 (대시보드에서만)
    refetchOnWindowFocus: isDashboardRoute,
    staleTime: 10000, // 10초 후 stale 처리
  })
}

// 수동 새로고침을 위한 유틸리티
export function useRefreshDashboard() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
}