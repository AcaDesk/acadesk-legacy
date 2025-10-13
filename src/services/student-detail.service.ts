/**
 * Student Detail Service
 * 학생 상세 페이지 데이터 로딩 서비스
 */

import { createClient } from '@/lib/supabase/server'
import type {
  StudentDetail,
  ExamScore,
  StudentTodo,
  Consultation,
  AttendanceRecord,
  Invoice,
  StudentDetailData,
} from '@/types/studentDetail.types'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

/**
 * 학생 기본 정보 조회
 */
export async function getStudentDetail(studentId: string): Promise<StudentDetail> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        enrollment_date,
        birth_date,
        gender,
        student_phone,
        profile_image_url,
        commute_method,
        marketing_source,
        emergency_contact,
        notes,
        users (
          name,
          email,
          phone
        ),
        student_guardians (
          guardians (
            id,
            relationship,
            users (
              name,
              phone
            )
          )
        ),
        class_enrollments (
          id,
          class_id,
          status,
          enrolled_at,
          end_date,
          withdrawal_reason,
          notes,
          classes (
            id,
            name,
            subject,
            instructor_id
          )
        ),
        student_schedules (
          day_of_week,
          scheduled_arrival_time
        )
      `)
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      logError(error, {
        service: 'StudentDetailService',
        method: 'getStudentDetail',
        studentId
      })
      throw new DatabaseError('학생 정보를 조회할 수 없습니다', error)
    }

    if (!data) {
      throw new NotFoundError('학생')
    }

    return data as unknown as StudentDetail
  } catch (error) {
    if (error instanceof DatabaseError || error instanceof NotFoundError) throw error
    logError(error, { service: 'StudentDetailService', method: 'getStudentDetail' })
    throw new DatabaseError('학생 정보를 조회할 수 없습니다')
  }
}

/**
 * 최근 성적 조회
 */
export async function getRecentScores(studentId: string): Promise<ExamScore[]> {
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
      .limit(10)

    if (error) {
      logError(error, {
        service: 'StudentDetailService',
        method: 'getRecentScores',
        studentId
      })
      // 성적이 없을 수도 있으므로 빈 배열 반환
      return []
    }

    return (data || []) as unknown as ExamScore[]
  } catch (error) {
    logError(error, { service: 'StudentDetailService', method: 'getRecentScores' })
    return []
  }
}

/**
 * 시험별 학급 평균 계산
 */
export async function getClassAverages(scores: ExamScore[]): Promise<Record<string, number>> {
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
        console.error(`Error loading class average for exam ${examId}:`, error)
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

/**
 * 최근 TODO 조회
 */
export async function getRecentTodos(studentId: string): Promise<StudentTodo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_todos')
    .select('*')
    .eq('student_id', studentId)
    .order('due_date', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error loading todos:', error)
    return []
  }

  return (data || []) as unknown as StudentTodo[]
}

/**
 * 상담 기록 조회
 */
export async function getConsultations(studentId: string): Promise<Consultation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('student_id', studentId)
    .order('consultation_date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error loading consultations:', error)
    return []
  }

  return (data || []) as unknown as Consultation[]
}

/**
 * 출석 기록 조회
 */
export async function getAttendanceRecords(studentId: string): Promise<AttendanceRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      status,
      check_in_at,
      check_out_at,
      notes,
      attendance_sessions (
        session_date,
        scheduled_start_at,
        scheduled_end_at,
        classes (
          name
        )
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error loading attendance:', error)
    return []
  }

  return (data || []) as unknown as AttendanceRecord[]
}

/**
 * 청구서 조회
 */
export async function getInvoices(studentId: string): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      billing_month,
      issue_date,
      due_date,
      total_amount,
      paid_amount,
      status,
      notes,
      created_at,
      invoice_items (
        id,
        description,
        amount,
        item_type
      ),
      payments (
        id,
        payment_date,
        paid_amount,
        payment_method,
        reference_number
      )
    `)
    .eq('student_id', studentId)
    .order('billing_month', { ascending: false })
    .limit(12)

  if (error) {
    console.error('Error loading invoices:', error)
    // invoices 테이블이 없을 수 있으므로 빈 배열 반환
    return []
  }

  return (data || []) as unknown as Invoice[]
}

/**
 * KPI 계산
 */
function calculateKPIs(
  attendanceRecords: AttendanceRecord[],
  recentScores: ExamScore[],
  recentTodos: StudentTodo[]
) {
  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round(
          (attendanceRecords.filter((r) => r.status === 'present').length /
            attendanceRecords.length) *
            100
        )
      : 0

  const avgScore =
    recentScores.length > 0
      ? Math.round(
          recentScores.reduce((sum, s) => sum + s.percentage, 0) /
            recentScores.length
        )
      : 0

  const homeworkRate =
    recentTodos.length > 0
      ? Math.round(
          (recentTodos.filter((t) => t.completed_at).length /
            recentTodos.length) *
            100
        )
      : 0

  return { attendanceRate, avgScore, homeworkRate }
}

/**
 * 모든 학생 상세 데이터를 병렬로 조회
 */
export async function getStudentDetailData(studentId: string): Promise<StudentDetailData> {
  const [
    student,
    recentScores,
    recentTodos,
    consultations,
    attendanceRecords,
    invoices,
  ] = await Promise.all([
    getStudentDetail(studentId),
    getRecentScores(studentId),
    getRecentTodos(studentId),
    getConsultations(studentId),
    getAttendanceRecords(studentId),
    getInvoices(studentId),
  ])

  // Calculate class averages after getting scores
  const classAverages = await getClassAverages(recentScores)

  // Calculate KPIs on server
  const kpis = calculateKPIs(attendanceRecords, recentScores, recentTodos)

  return {
    student,
    recentScores,
    classAverages,
    recentTodos,
    consultations,
    attendanceRecords,
    invoices,
    kpis,
  }
}
