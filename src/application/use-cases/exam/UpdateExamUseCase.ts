/**
 * UpdateExamUseCase
 * 시험 수정 Use Case
 */

import type { IExamRepository } from '@/domain/repositories/IExamRepository'
import type { ExamDTO } from '@/domain/entities/Exam'

export interface UpdateExamInput {
  id: string
  name?: string
  examDate?: string
  totalQuestions?: number
  description?: string
}

export interface UpdateExamOutput {
  exam: ExamDTO
}

export class UpdateExamUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(input: UpdateExamInput): Promise<UpdateExamOutput> {
    // Find existing exam
    const exam = await this.examRepository.findById(input.id)
    if (!exam) {
      throw new Error('시험을 찾을 수 없습니다.')
    }

    // Update exam
    const updated = exam.update({
      name: input.name,
      examDate: input.examDate ? new Date(input.examDate) : undefined,
      totalQuestions: input.totalQuestions,
      description: input.description,
    })

    // Save
    const saved = await this.examRepository.save(updated)

    return {
      exam: saved.toDTO(),
    }
  }
}
