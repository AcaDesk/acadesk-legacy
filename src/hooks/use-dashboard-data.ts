/**
 * useDashboardData Hook
 *
 * Fetches dashboard data using Server Actions
 * TODO: Replace old RPC-based approach with Server Actions
 */

'use client'

import { useEffect, useState } from 'react'

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

import type { DashboardData } from '@/core/types/dashboard'

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

export function useDashboardData(): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardDataCompat | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // TODO: Call Server Action instead of RPC
      // const result = await getDashboardData()

      // For now, return mock data
      setData({
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
      })
    } catch (err) {
      console.error('[useDashboardData] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}
