import type {
  AttendanceStatus,
  GrowthTrend,
} from "@/domain/entities/dashboard-stats.entity"

export interface GetDashboardStatsInput {
  tenantId: string
  periodStart: string
  periodEnd: string
}

export interface GetDashboardStatsOutput {
  totalStudents: number
  averageAttendanceRate: number
  activeClasses: number
  growthRate: number
  periodStart: string
  periodEnd: string
  attendanceStatus: AttendanceStatus
  growthTrend: GrowthTrend
}
