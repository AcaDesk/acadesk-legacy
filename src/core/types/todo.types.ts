/**
 * Todo Types
 * TODO 관련 타입 정의 (프레젠테이션 계층용)
 */

/**
 * 학생 TODO (데이터베이스 직접 매핑)
 */
export interface StudentTodo {
  id: string
  tenant_id: string
  student_id: string
  title: string
  description: string | null
  subject: string | null
  due_date: string
  due_day_of_week: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  completed_at: string | null
  verified_at: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

/**
 * 학생 정보가 포함된 TODO (조인 쿼리 결과)
 */
export interface StudentTodoWithStudent extends StudentTodo {
  students: {
    id?: string
    student_code: string
    users?: {
      name: string
    } | Array<{
      name: string
    }> | null
    name?: string
    user_id?: string | null
  } | null
}
