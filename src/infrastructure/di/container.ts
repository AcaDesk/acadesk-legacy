import type { SupabaseClient } from "@supabase/supabase-js"
import type { IStudentRepository } from "@/domain/repositories/student.repository.interface"
import type { IDashboardRepository } from "@/domain/repositories/dashboard.repository.interface"
import { SupabaseStudentRepository } from "../repositories/supabase-student.repository"
import { SupabaseDashboardRepository } from "../repositories/supabase-dashboard.repository"
import { GetDashboardStatsUseCase } from "@/application/use-cases/get-dashboard-stats/get-dashboard-stats.use-case"
import { ListStudentsUseCase } from "@/application/use-cases/list-students/list-students.use-case"

/**
 * DI Container
 * 의존성 주입을 관리하는 싱글톤 컨테이너
 */
export class DIContainer {
  private static instance: DIContainer
  private repositories: Map<string, IStudentRepository | IDashboardRepository> = new Map()
  private useCases: Map<string, GetDashboardStatsUseCase | ListStudentsUseCase> = new Map()

  private constructor(private readonly supabase: SupabaseClient) {
    this.initializeRepositories()
    this.initializeUseCases()
  }

  static initialize(supabase: SupabaseClient): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer(supabase)
    }
    return DIContainer.instance
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      throw new Error("DIContainer not initialized. Call initialize() first.")
    }
    return DIContainer.instance
  }

  private initializeRepositories(): void {
    this.repositories.set(
      "studentRepository",
      new SupabaseStudentRepository(this.supabase)
    )
    this.repositories.set(
      "dashboardRepository",
      new SupabaseDashboardRepository(this.supabase)
    )
  }

  private initializeUseCases(): void {
    this.useCases.set(
      "getDashboardStatsUseCase",
      new GetDashboardStatsUseCase(this.getDashboardRepository())
    )
    this.useCases.set(
      "listStudentsUseCase",
      new ListStudentsUseCase(this.getStudentRepository())
    )
  }

  getStudentRepository(): IStudentRepository {
    return this.repositories.get("studentRepository") as IStudentRepository
  }

  getDashboardRepository(): IDashboardRepository {
    return this.repositories.get("dashboardRepository") as IDashboardRepository
  }

  getGetDashboardStatsUseCase(): GetDashboardStatsUseCase {
    return this.useCases.get("getDashboardStatsUseCase") as GetDashboardStatsUseCase
  }

  getListStudentsUseCase(): ListStudentsUseCase {
    return this.useCases.get("listStudentsUseCase") as ListStudentsUseCase
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase
  }
}
