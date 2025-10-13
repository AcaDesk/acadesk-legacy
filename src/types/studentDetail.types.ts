/**
 * Student Detail Page Types
 * 학생 상세 페이지에서 사용하는 타입 정의
 */

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
  student_guardians: Array<{
    guardians: {
      id: string
      relationship: string | null
      users: {
        name: string
        phone: string | null
      } | null
    } | null
  }>
  class_enrollments: Array<{
    class_id: string
    classes: {
      id: string
      name: string
      subject: string | null
      instructor_id: string | null
    } | null
  }>
  student_schedules: Array<{
    day_of_week: number
    scheduled_arrival_time: string
  }>
}

export interface ExamScore {
  id: string
  percentage: number
  created_at: string
  exam_id: string
  exams: {
    id: string
    name: string
    exam_date: string
    category_code: string
    class_id: string | null
  } | null
}

export interface StudentTodo {
  id: string
  title: string
  due_date: string
  subject: string | null
  completed_at: string | null
}

export interface Consultation {
  id: string
  consultation_date: string
  consultation_type: string
  content: string
  created_at: string
  instructor_id?: string
}

export interface AttendanceRecord {
  id: string
  status: string
  check_in_at: string | null
  check_out_at: string | null
  notes: string | null
  attendance_sessions: {
    session_date: string
    scheduled_start_at: string
    scheduled_end_at: string
    classes: {
      name: string
    } | null
  } | null
}

export interface Invoice {
  id: string
  billing_month: string
  issue_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
  notes: string | null
  created_at: string
  invoice_items: Array<{
    id: string
    description: string
    amount: number
    item_type: string
  }>
  payments: Array<{
    id: string
    payment_date: string
    paid_amount: number
    payment_method: string
    reference_number: string | null
  }>
}

export interface KPIs {
  attendanceRate: number
  avgScore: number
  homeworkRate: number
}

export interface StudentDetailData {
  student: StudentDetail
  recentScores: ExamScore[]
  classAverages: Record<string, number>
  recentTodos: StudentTodo[]
  consultations: Consultation[]
  attendanceRecords: AttendanceRecord[]
  invoices: Invoice[]
  kpis: KPIs
}
