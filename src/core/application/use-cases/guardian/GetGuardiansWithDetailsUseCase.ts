/**
 * Get Guardians With Details Use Case
 * 보호자 상세 정보 조회 유스케이스
 */

import type { IGuardianRepository, GuardianWithDetails } from '@core/domain/repositories/IGuardianRepository'

export interface GetGuardiansWithDetailsInput {
  tenantId: string
}

export interface GetGuardiansWithDetailsOutput {
  guardians: GuardianWithDetails[]
  error: Error | null
}

export class GetGuardiansWithDetailsUseCase {
  constructor(private readonly guardianRepository: IGuardianRepository) {}

  async execute(input: GetGuardiansWithDetailsInput): Promise<GetGuardiansWithDetailsOutput> {
    try {
      const guardians = await this.guardianRepository.findAllWithDetails(input.tenantId)

      return {
        guardians,
        error: null,
      }
    } catch (error) {
      console.error('[GetGuardiansWithDetailsUseCase] Error:', error)
      return {
        guardians: [],
        error: error as Error,
      }
    }
  }
}
