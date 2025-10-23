/**
 * CreateExamUseCase
 * 시험 생성 Use Case
 */

import type { IExamRepository } from '@core/domain/repositories/IExamRepository'
import { Exam } from '@core/domain/entities/Exam'
import type { ExamDTO } from '@core/domain/entities/Exam'

export interface CreateExamInput {
  tenantId: string
  classId: string
  name: string
  categoryCode: string
  examDate: string
  totalQuestions: number
  description?: string
}

export interface CreateExamOutput {
  exam: ExamDTO
}

export class CreateExamUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(input: CreateExamInput): Promise<CreateExamOutput> {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('시험 이름을 입력해주세요.')
    }

    if (input.totalQuestions <= 0) {
      throw new Error('총 문항 수는 1 이상이어야 합니다.')
    }

    // Create exam entity
    const exam = Exam.create({
      tenantId: input.tenantId,
      classId: input.classId,
      name: input.name.trim(),
      categoryCode: input.categoryCode,
      examDate: new Date(input.examDate),
      totalQuestions: input.totalQuestions,
      description: input.description?.trim() || null,
    })

    // Save
    const saved = await this.examRepository.save(exam)

    return {
      exam: saved.toDTO(),
    }
  }
}
