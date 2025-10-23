/**
 * GetStudentsWithDetailsUseCase
 * 학생 목록 조회 Use Case (users 및 class_enrollments 정보 포함)
 */

import type { IStudentRepository, StudentFilters, StudentWithDetails } from '@/domain/repositories/IStudentRepository'

export interface GetStudentsWithDetailsInput {
  tenantId: string
  filters?: StudentFilters
  includeDeleted?: boolean
  includeWithdrawn?: boolean
}

export interface GetStudentsWithDetailsOutput {
  students: StudentWithDetails[]
  error: Error | null
}

export class GetStudentsWithDetailsUseCase {
  constructor(private readonly studentRepository: IStudentRepository) {}

  async execute(input: GetStudentsWithDetailsInput): Promise<GetStudentsWithDetailsOutput> {
    try {
      const students = await this.studentRepository.findAllWithDetails(
        input.tenantId,
        input.filters,
        {
          includeDeleted: input.includeDeleted,
          includeWithdrawn: input.includeWithdrawn,
        }
      )

      return {
        students,
        error: null,
      }
    } catch (error) {
      console.error('[GetStudentsWithDetailsUseCase] Error:', error)
      return {
        students: [],
        error: error as Error,
      }
    }
  }
}
