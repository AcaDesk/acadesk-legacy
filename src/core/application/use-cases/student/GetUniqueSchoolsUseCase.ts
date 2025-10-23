/**
 * GetUniqueSchoolsUseCase
 * 고유한 학교 목록 조회 Use Case
 */

import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'

export interface GetUniqueSchoolsInput {
  tenantId: string
}

export interface GetUniqueSchoolsOutput {
  schools: string[]
  error: Error | null
}

export class GetUniqueSchoolsUseCase {
  constructor(private readonly studentRepository: IStudentRepository) {}

  async execute(input: GetUniqueSchoolsInput): Promise<GetUniqueSchoolsOutput> {
    try {
      const schools = await this.studentRepository.findUniqueSchools(input.tenantId)

      return {
        schools,
        error: null,
      }
    } catch (error) {
      console.error('[GetUniqueSchoolsUseCase] Error:', error)
      return {
        schools: [],
        error: error as Error,
      }
    }
  }
}
