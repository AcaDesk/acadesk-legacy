import { DashboardStats } from "../entities/dashboard-stats.entity"

export interface DatePeriod {
  startDate: Date
  endDate: Date
}

export interface AttendanceChartData {
  date: string
  desktop: number
  mobile: number
}

export interface GrowthData {
  month: string
  students: number
}

/**
 * Dashboard Repository Interface
 * 대시보드 통계 데이터 접근을 추상화
 */
export interface IDashboardRepository {
  getStats(tenantId: string, period: DatePeriod): Promise<DashboardStats>
  getAttendanceChartData(
    tenantId: string,
    period: DatePeriod
  ): Promise<AttendanceChartData[]>
  getStudentGrowthData(
    tenantId: string,
    period: DatePeriod
  ): Promise<GrowthData[]>
}
