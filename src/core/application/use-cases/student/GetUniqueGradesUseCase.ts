/**
 * GetUniqueGradesUseCase
 * 고유한 학년 목록 조회 Use Case
 */

import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'

export interface GetUniqueGradesInput {
  tenantId: string
}

export interface GetUniqueGradesOutput {
  grades: string[]
  error: Error | null
}

export class GetUniqueGradesUseCase {
  constructor(private readonly studentRepository: IStudentRepository) {}

  async execute(input: GetUniqueGradesInput): Promise<GetUniqueGradesOutput> {
    try {
      const grades = await this.studentRepository.findUniqueGrades(input.tenantId)

      return {
        grades,
        error: null,
      }
    } catch (error) {
      console.error('[GetUniqueGradesUseCase] Error:', error)
      return {
        grades: [],
        error: error as Error,
      }
    }
  }
}
