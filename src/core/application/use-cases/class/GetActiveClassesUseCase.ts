/**
 * Get Active Classes Use Case
 * 활성화된 수업 목록 조회 (id, name만)
 */

import { IClassRepository } from '@core/domain/repositories/IClassRepository'

export interface ActiveClassDTO {
  id: string
  name: string
}

export class GetActiveClassesUseCase {
  constructor(private readonly classRepository: IClassRepository) {}

  async execute(): Promise<ActiveClassDTO[]> {
    const classesWithDetails = await this.classRepository.findAllWithDetails()

    // 활성화된 클래스만 필터링하고 id, name만 반환
    return classesWithDetails
      .filter(item => item.class.isActive())
      .map(item => ({
        id: item.class.id,
        name: item.class.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
