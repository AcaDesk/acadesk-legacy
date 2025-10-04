import { AttendanceRate } from "../value-objects/attendance-rate.vo"

export type AttendanceStatus = "good" | "warning" | "poor"
export type GrowthTrend = "growing" | "stable" | "declining"

export interface DashboardStatsProps {
  totalStudents: number
  averageAttendanceRate: number
  activeClasses: number
  growthRate: number
  periodStart: string
  periodEnd: string
}

export interface DashboardStatsDTO {
  totalStudents: number
  averageAttendanceRate: number
  activeClasses: number
  growthRate: number
  periodStart: string
  periodEnd: string
  attendanceStatus: AttendanceStatus
  growthTrend: GrowthTrend
}

/**
 * Dashboard Stats Entity
 * 대시보드 통계 정보를 관리하는 엔티티
 */
export class DashboardStats {
  private constructor(
    private readonly totalStudents: number,
    private readonly averageAttendanceRate: AttendanceRate,
    private readonly activeClasses: number,
    private readonly growthRate: number,
    private readonly periodStart: Date,
    private readonly periodEnd: Date
  ) {}

  static create(props: DashboardStatsProps): DashboardStats {
    return new DashboardStats(
      props.totalStudents,
      AttendanceRate.create(props.averageAttendanceRate),
      props.activeClasses,
      props.growthRate,
      new Date(props.periodStart),
      new Date(props.periodEnd)
    )
  }

  getTotalStudents(): number {
    return this.totalStudents
  }

  getAverageAttendanceRate(): AttendanceRate {
    return this.averageAttendanceRate
  }

  getActiveClasses(): number {
    return this.activeClasses
  }

  getGrowthRate(): number {
    return this.growthRate
  }

  getAttendanceStatus(): AttendanceStatus {
    return this.averageAttendanceRate.getStatus()
  }

  getGrowthTrend(): GrowthTrend {
    if (this.growthRate > 5) return "growing"
    if (this.growthRate < -5) return "declining"
    return "stable"
  }

  toDTO(): DashboardStatsDTO {
    return {
      totalStudents: this.totalStudents,
      averageAttendanceRate: this.averageAttendanceRate.getValue(),
      activeClasses: this.activeClasses,
      growthRate: this.growthRate,
      periodStart: this.periodStart.toISOString().split("T")[0],
      periodEnd: this.periodEnd.toISOString().split("T")[0],
      attendanceStatus: this.getAttendanceStatus(),
      growthTrend: this.getGrowthTrend(),
    }
  }
}
