/**
 * DeleteExamUseCase
 * 시험 삭제 Use Case
 */

import type { IExamRepository } from '@/domain/repositories/IExamRepository'

export interface DeleteExamInput {
  id: string
}

export interface DeleteExamOutput {
  success: boolean
}

export class DeleteExamUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(input: DeleteExamInput): Promise<DeleteExamOutput> {
    // Find existing exam
    const exam = await this.examRepository.findById(input.id)
    if (!exam) {
      throw new Error('시험을 찾을 수 없습니다.')
    }

    // Delete exam
    await this.examRepository.delete(input.id)

    return {
      success: true,
    }
  }
}
