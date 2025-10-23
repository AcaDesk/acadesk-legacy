/**
 * Get Student Todos Use Case
 * 학생 TODO 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'

export interface StudentTodoDTO {
  id: string
  student_id: string
  title: string
  description: string | null
  subject: string | null
  due_date: string
  completed_at: string | null
  verified_at: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

export class GetStudentTodosUseCase {
  async execute(studentId: string, limit: number = 10): Promise<StudentTodoDTO[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('student_todos')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })
      .limit(limit)

    if (error) {
      // 테이블이 없는 경우 조용히 실패
      const errorMessage = error.message || String(error)
      if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
        logError(error, {
          useCase: 'GetStudentTodosUseCase',
          method: 'execute',
          studentId
        })
      }
      return []
    }

    return (data || []) as StudentTodoDTO[]
  }
}
