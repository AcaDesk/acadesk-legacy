import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  IDashboardRepository,
  DatePeriod,
  AttendanceChartData,
  GrowthData,
} from "@/domain/repositories/dashboard.repository.interface"
import { DashboardStats } from "@/domain/entities/dashboard-stats.entity"

export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getStats(tenantId: string, period: DatePeriod): Promise<DashboardStats> {
    const totalStudents = await this.getTotalStudents(tenantId)
    const averageAttendanceRate = await this.getAverageAttendanceRate(tenantId)
    const activeClasses = await this.getActiveClasses(tenantId)
    const growthRate = await this.calculateGrowthRate(tenantId, period)

    return DashboardStats.create({
      totalStudents,
      averageAttendanceRate,
      activeClasses,
      growthRate,
      periodStart: period.startDate.toISOString(),
      periodEnd: period.endDate.toISOString(),
    })
  }

  async getAttendanceChartData(
    _tenantId: string,
    period: DatePeriod
  ): Promise<AttendanceChartData[]> {
    // TODO: 실제 출석 데이터 구현
    const mockData: AttendanceChartData[] = []
    const daysDiff = Math.floor(
      (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(period.startDate)
      date.setDate(date.getDate() + i)

      mockData.push({
        date: date.toISOString().split("T")[0],
        desktop: Math.floor(Math.random() * 500),
        mobile: Math.floor(Math.random() * 500),
      })
    }

    return mockData
  }

  async getStudentGrowthData(
    _tenantId: string,
    _period: DatePeriod
  ): Promise<GrowthData[]> {
    // TODO: 실제 성장 데이터 구현
    return []
  }

  private async getTotalStudents(tenantId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    if (error) {
      throw new Error(`Failed to get total students: ${error.message}`)
    }

    return count || 0
  }

  private async getAverageAttendanceRate(tenantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("students")
      .select("attendance_rate")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    if (error) {
      throw new Error(`Failed to get average attendance rate: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return 0
    }

    const sum = data.reduce((acc, row) => acc + (row.attendance_rate || 0), 0)
    return Math.round((sum / data.length) * 100) / 100
  }

  private async getActiveClasses(_tenantId: string): Promise<number> {
    // TODO: classes 테이블 구현 시 실제 쿼리로 변경
    return 234
  }

  private async calculateGrowthRate(
    tenantId: string,
    period: DatePeriod
  ): Promise<number> {
    const currentCount = await this.getTotalStudents(tenantId)

    const previousEnd = period.startDate

    const { count: previousCount, error } = await this.supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .lt("created_at", previousEnd.toISOString())
      .is("deleted_at", null)

    if (error) {
      return 0
    }

    if (!previousCount || previousCount === 0) {
      return currentCount > 0 ? 100 : 0
    }

    return Math.round(
      ((currentCount - previousCount) / previousCount) * 100 * 100
    ) / 100
  }
}
