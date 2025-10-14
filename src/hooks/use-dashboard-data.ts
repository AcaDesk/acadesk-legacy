import { useQuery } from '@tanstack/react-query'
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