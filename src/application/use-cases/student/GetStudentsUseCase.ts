/**
 * GetStudentsUseCase
 * 학생 목록 조회 Use Case (필터링 포함)
 */

import type { IStudentRepository, StudentFilters } from '@/domain/repositories/IStudentRepository'
import type { Student } from '@/domain/entities/Student'

export interface GetStudentsInput {
  tenantId: string
  filters?: StudentFilters
  includeDeleted?: boolean
  includeWithdrawn?: boolean
}

export interface GetStudentsOutput {
  students: Student[]
  error: Error | null
}

export class GetStudentsUseCase {
  constructor(private readonly studentRepository: IStudentRepository) {}

  async execute(input: GetStudentsInput): Promise<GetStudentsOutput> {
    try {
      const students = await this.studentRepository.findAll(
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
      console.error('[GetStudentsUseCase] Error:', error)
      return {
        students: [],
        error: error as Error,
      }
    }
  }
}
