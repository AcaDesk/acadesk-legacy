/**
 * Get Student Consultations Use Case
 * 학생 상담 기록 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'

export interface ConsultationDTO {
  id: string
  student_id: string
  consultation_date: string
  consultation_type: string | null
  content: string | null
  follow_up_needed: boolean | null
  follow_up_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export class GetStudentConsultationsUseCase {
  async execute(studentId: string, limit: number = 20): Promise<ConsultationDTO[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('student_id', studentId)
      .order('consultation_date', { ascending: false })
      .limit(limit)

    if (error) {
      // 테이블이 없는 경우 조용히 실패
      const errorMessage = error.message || String(error)
      if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
        logError(error, {
          useCase: 'GetStudentConsultationsUseCase',
          method: 'execute',
          studentId
        })
      }
      return []
    }

    return (data || []) as ConsultationDTO[]
  }
}
