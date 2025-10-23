/**
 * Delete Guardian Use Case
 * 보호자 삭제 유스케이스
 */

import type { IGuardianRepository } from '@core/domain/repositories/IGuardianRepository'

export class DeleteGuardianUseCase {
  constructor(private readonly guardianRepository: IGuardianRepository) {}

  async execute(id: string): Promise<void> {
    await this.guardianRepository.delete(id)
  }
}
