/**
 * GetUpcomingExamsUseCase
 * 다가오는 시험 조회 Use Case
 */

import type { IExamRepository } from '@core/domain/repositories/IExamRepository'
import type { ExamDTO } from '@core/domain/entities/Exam'

export interface GetUpcomingExamsInput {
  tenantId: string
  daysAhead?: number
}

export interface GetUpcomingExamsOutput {
  exams: ExamDTO[]
}

export class GetUpcomingExamsUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(input: GetUpcomingExamsInput): Promise<GetUpcomingExamsOutput> {
    const daysAhead = input.daysAhead ?? 30 // default 30 days

    const exams = await this.examRepository.findUpcoming(input.tenantId, daysAhead)

    return {
      exams: exams.map((exam) => exam.toDTO()),
    }
  }
}
