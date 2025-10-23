/**
 * Get Class Averages Use Case
 * 시험별 학급 평균 계산 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'
import type { ExamScoreDTO } from './GetStudentScoresUseCase'

export class GetClassAveragesUseCase {
  async execute(scores: ExamScoreDTO[]): Promise<Record<string, number>> {
    const supabase = await createClient()
    const averages: Record<string, number> = {}

    // Get unique exam IDs
    const examIds = [...new Set(scores.map((s) => s.exam_id).filter(Boolean))]

    // For each exam, calculate class average
    await Promise.all(
      examIds.map(async (examId) => {
        const { data, error } = await supabase
          .from('exam_scores')
          .select('percentage')
          .eq('exam_id', examId)

        if (error) {
          // 테이블이 없는 경우 조용히 실패
          const errorMessage = error.message || String(error)
          if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
            logError(error, {
              useCase: 'GetClassAveragesUseCase',
              method: 'execute',
              examId
            })
          }
          return
        }

        if (data && data.length > 0) {
          const average = data.reduce((sum, s) => sum + s.percentage, 0) / data.length
          averages[examId] = Math.round(average * 10) / 10 // Round to 1 decimal
        }
      })
    )

    return averages
  }
}
