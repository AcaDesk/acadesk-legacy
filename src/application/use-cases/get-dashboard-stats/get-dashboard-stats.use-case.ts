import type { IDashboardRepository } from "@/domain/repositories/dashboard.repository.interface"
import type {
  GetDashboardStatsInput,
  GetDashboardStatsOutput,
} from "./get-dashboard-stats.dto"

/**
 * Get Dashboard Stats Use Case
 * 대시보드 통계 정보를 조회하는 유스케이스
 */
export class GetDashboardStatsUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}

  async execute(input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    this.validateInput(input)

    const startDate = this.parseDate(input.periodStart)
    const endDate = this.parseDate(input.periodEnd)

    const stats = await this.dashboardRepository.getStats(input.tenantId, {
      startDate,
      endDate,
    })

    return stats.toDTO()
  }

  private validateInput(input: GetDashboardStatsInput): void {
    if (!input.tenantId) {
      throw new Error("tenantId is required")
    }
    if (!input.periodStart) {
      throw new Error("periodStart is required")
    }
    if (!input.periodEnd) {
      throw new Error("periodEnd is required")
    }

    const startDate = new Date(input.periodStart)
    const endDate = new Date(input.periodEnd)

    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid periodStart date format")
    }
    if (isNaN(endDate.getTime())) {
      throw new Error("Invalid periodEnd date format")
    }
    if (startDate > endDate) {
      throw new Error("periodStart must be before periodEnd")
    }
  }

  private parseDate(dateString: string): Date {
    return new Date(dateString)
  }
}
