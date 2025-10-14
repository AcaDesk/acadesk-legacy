/**
 * Student Service - 학생 관련 비즈니스 로직
 *
 * 역할:
 * - StudentRepository를 사용하여 데이터 조회
 * - 여러 repository의 데이터를 조합
 * - 비즈니스 규칙 적용
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ==================== Types ====================

export interface StudentDetail {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  enrollment_date: string
  birth_date: string | null
  gender: string | null
  student_phone: string | null
  profile_image_url: string | null
  commute_method: string | null
  marketing_source: string | null
  emergency_contact: string | null
  notes: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
}

export interface StudentGuardian {
  id: string
  guardian_id: string
  is_primary: boolean
  guardians: {
    id: string
    relationship: string | null
    users: {
      name: string
      email: string | null
      phone: string | null
    }
  }
}

export interface StudentClass {
  id: string
  class_id: string
  enrolled_at: string
  status: string
  classes: {
    id: string
    name: string
    subject: string | null
    grade_level: string | null
    schedule: Record<string, string[]> | null
    capacity: number | null
  }
}

export interface StudentConsultation {
  id: string
  consultation_date: string
  consultation_time: string | null
  consultation_type: string | null
  content: string
  follow_up_required: boolean
  follow_up_date: string | null
  created_at: string
}

export interface StudentExamScore {
  id: string
  percentage: number
  exams: {
    id: string
    name: string
    exam_date: string
    class_id: string
  }
}

export interface StudentTodo {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

export interface StudentAttendance {
  id: string
  session_id: string
  status: string
  check_in_at: string | null
  check_out_at: string | null
  attendance_sessions: {
    session_date: string
    scheduled_start_at: string
    scheduled_end_at: string
    classes: {
      name: string
    }
  }
}

export interface StudentInvoice {
  id: string
  invoice_number: string
  billing_month: string
  tuition_fee: number
  amount_paid: number
  status: string
  due_date: string | null
  payment_date: string | null
}

export interface StudentStats {
  totalConsultations: number
  averageGrade: number
  completedTodos: number
  totalTodos: number
  attendanceRate: number
  totalClasses: number
}

// ==================== Service Class ====================

export class StudentService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * 학생 기본 정보 조회
   */
  async getStudentById(studentId: string): Promise<StudentDetail | null> {
    const { data, error } = await this.supabase
      .from('students')
      .select(`
        *,
        users (
          name,
          email,
          phone
        )
      `)
      .eq('id', studentId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data
  }

  /**
   * 학생의 보호자 목록 조회
   */
  async getStudentGuardians(studentId: string): Promise<StudentGuardian[]> {
    const { data, error } = await this.supabase
      .from('student_guardians')
      .select(`
        id,
        guardian_id,
        is_primary,
        guardians (
          id,
          relationship,
          users (
            name,
            email,
            phone
          )
        )
      `)
      .eq('student_id', studentId)

    if (error) throw error
    return data || []
  }

  /**
   * 학생의 수업 목록 조회
   */
  async getStudentClasses(studentId: string): Promise<StudentClass[]> {
    const { data, error } = await this.supabase
      .from('class_enrollments')
      .select(`
        id,
        class_id,
        enrolled_at,
        status,
        classes (
          id,
          name,
          subject,
          grade_level,
          schedule,
          capacity
        )
      `)
      .eq('student_id', studentId)
      .order('enrolled_at', { ascending: false })

    if (error) throw error
    return data as unknown as StudentClass[] || []
  }

  /**
   * 학생의 상담 기록 조회
   */
  async getStudentConsultations(studentId: string, limit: number = 10): Promise<StudentConsultation[]> {
    const { data, error } = await this.supabase
      .from('consultations')
      .select('*')
      .eq('student_id', studentId)
      .order('consultation_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * 학생의 시험 성적 조회
   */
  async getStudentExamScores(studentId: string, limit: number = 20): Promise<StudentExamScore[]> {
    const { data, error } = await this.supabase
      .from('exam_scores')
      .select(`
        id,
        percentage,
        exams!inner (
          id,
          name,
          exam_date,
          class_id
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Sort by exam_date client-side since we can't order by foreign table columns
    const sorted = (data || []).sort((a, b) => {
      const dateA = new Date(a.exams.exam_date).getTime()
      const dateB = new Date(b.exams.exam_date).getTime()
      return dateB - dateA // descending
    })

    return sorted
  }

  /**
   * 학생의 평균 성적 계산
   */
  async getStudentAverageGrade(studentId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('exam_scores')
      .select('percentage')
      .eq('student_id', studentId)

    if (error) throw error

    if (!data || data.length === 0) return 0

    const sum = data.reduce((acc, score) => acc + score.percentage, 0)
    return Math.round(sum / data.length)
  }

  /**
   * 학생의 할일 목록 조회
   */
  async getStudentTodos(studentId: string): Promise<StudentTodo[]> {
    const { data, error } = await this.supabase
      .from('student_todos')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * 학생의 출석 기록 조회
   */
  async getStudentAttendance(studentId: string, limit: number = 50): Promise<StudentAttendance[]> {
    const { data, error } = await this.supabase
      .from('attendance')
      .select(`
        id,
        session_id,
        status,
        check_in_at,
        check_out_at,
        attendance_sessions!inner (
          session_date,
          scheduled_start_at,
          scheduled_end_at,
          classes (
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .order('check_in_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Sort by session_date client-side
    const sorted = (data || []).sort((a, b) => {
      const dateA = new Date(a.attendance_sessions.session_date).getTime()
      const dateB = new Date(b.attendance_sessions.session_date).getTime()
      return dateB - dateA // descending
    })

    return sorted
  }

  /**
   * 학생의 학원비 청구 내역 조회
   */
  async getStudentInvoices(studentId: string): Promise<StudentInvoice[]> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        billing_month,
        tuition_fee,
        amount_paid,
        status,
        due_date,
        payment_date
      `)
      .eq('student_id', studentId)
      .order('billing_month', { ascending: false })

    // If table doesn't exist yet, return empty array
    if (error?.code === 'PGRST205') return []
    if (error) throw error
    return data || []
  }

  /**
   * 학생 통계 정보 조회 (모든 데이터 한 번에)
   */
  async getStudentStats(studentId: string): Promise<StudentStats> {
    const [
      consultations,
      averageGrade,
      todos,
      attendance,
      classes,
    ] = await Promise.all([
      this.getStudentConsultations(studentId, 1000), // 전체 조회
      this.getStudentAverageGrade(studentId),
      this.getStudentTodos(studentId),
      this.getStudentAttendance(studentId, 1000),
      this.getStudentClasses(studentId),
    ])

    const completedTodos = todos.filter(t => t.completed_at).length
    const presentAttendance = attendance.filter(a => a.status === 'present').length
    const attendanceRate = attendance.length > 0
      ? Math.round((presentAttendance / attendance.length) * 100)
      : 0

    return {
      totalConsultations: consultations.length,
      averageGrade,
      completedTodos,
      totalTodos: todos.length,
      attendanceRate,
      totalClasses: classes.filter(c => c.status === 'active').length,
    }
  }

  /**
   * 학생 상세 정보 전체 조회 (한 번에 모든 데이터)
   */
  async getStudentFullDetail(studentId: string) {
    const [
      student,
      guardians,
      classes,
      consultations,
      examScores,
      todos,
      attendance,
      invoices,
      stats,
    ] = await Promise.all([
      this.getStudentById(studentId),
      this.getStudentGuardians(studentId),
      this.getStudentClasses(studentId),
      this.getStudentConsultations(studentId),
      this.getStudentExamScores(studentId),
      this.getStudentTodos(studentId),
      this.getStudentAttendance(studentId),
      this.getStudentInvoices(studentId),
      this.getStudentStats(studentId),
    ])

    return {
      student,
      guardians,
      classes,
      consultations,
      examScores,
      todos,
      attendance,
      invoices,
      stats,
    }
  }

  /**
   * 학생 프로필 이미지 업데이트
   */
  async updateStudentProfileImage(studentId: string, imageUrl: string): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .update({ profile_image_url: imageUrl })
      .eq('id', studentId)

    if (error) throw error
  }

  /**
   * 학생 정보 업데이트
   */
  async updateStudent(studentId: string, updates: Partial<StudentDetail>): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)

    if (error) throw error
  }

  /**
   * 학생 삭제 (soft delete)
   */
  async deleteStudent(studentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', studentId)

    if (error) throw error
  }
}

// ==================== Helper Functions ====================

/**
 * Server-side에서 StudentService 인스턴스 생성
 */
export async function createStudentService(): Promise<StudentService> {
  const supabase = await createClient()
  return new StudentService(supabase)
}
