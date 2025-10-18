/**
 * Get Student Scores Use Case
 * 학생 성적 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'

export interface ExamScoreDTO {
  id: string
  percentage: number
  created_at: string
  exam_id: string
  exams: {
    id: string
    name: string
    exam_date: string
    category_code: string | null
    class_id: string | null
  }
}

export class GetStudentScoresUseCase {
  async execute(studentId: string, limit: number = 10): Promise<ExamScoreDTO[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('exam_scores')
        .select(`
          id,
          percentage,
          created_at,
          exam_id,
          exams (
            id,
            name,
            exam_date,
            category_code,
            class_id
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logError(error, {
          useCase: 'GetStudentScoresUseCase',
          method: 'execute',
          studentId
        })
        // 성적이 없을 수도 있으므로 빈 배열 반환
        return []
      }

      return (data || []) as unknown as ExamScoreDTO[]
    } catch (error) {
      logError(error, { useCase: 'GetStudentScoresUseCase', method: 'execute' })
      return []
    }
  }
}
