/**
 * Report Types
 * 리포트 관련 타입 정의
 */

/**
 * Student information (for report joins)
 */
export interface ReportStudent {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
    email: string | null
  } | null
}

/**
 * Student information (for filter dropdowns)
 */
export interface StudentForFilter {
  id: string
  student_code: string
  user_id: {
    name: string
  } | null
}

/**
 * Report with student information (from Supabase joins)
 */
export interface ReportWithStudent {
  id: string
  report_type: string
  period_start: string
  period_end: string
  content: ReportData
  generated_at: string
  sent_at: string | null
  students: ReportStudent | null
}

export interface ReportData {
  // Legacy format (for backward compatibility)
  student?: {
    id: string
    name: string
    grade: string
    student_code: string
  }

  // New format (flat structure)
  studentName?: string
  studentCode?: string
  grade?: string

  academy: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
    website: string | null
  }
  period: {
    start: string
    end: string
  }
  attendance: {
    total: number
    present: number
    late: number
    absent: number
    rate: number
  }
  homework: {
    total: number
    completed: number
    rate: number
  }
  scores: {
    category: string
    current: number
    previous: number | null
    change: number | null
    average: number | null
    retestRate: number | null
    tests: Array<{
      name: string
      date: string
      percentage: number
      feedback: string | null
    }>
  }[]

  // Comment data (new structured format)
  comment?: {
    summary: string
    strengths: string
    improvements: string
    nextGoals: string
  }

  // Legacy comment fields (for backward compatibility)
  instructorComment?: string
  overallComment?: string

  // Chart data for visualization
  gradesChartData?: Array<{
    examName: string
    score: number
    classAverage?: number
    date?: string
  }>
  attendanceChartData?: Array<{
    date: Date
    status: 'present' | 'late' | 'absent' | 'none'
    note?: string
  }>

  // New data for enhanced visualization
  currentScore?: {
    myScore: number
    classAverage: number
    highestScore: number
  }

  scoreTrend?: Array<{
    name: string
    '내 점수': number
    '반 평균': number
    '재시험률'?: number
  }>

  // Additional fields for compatibility
  attendanceRate?: number
  totalDays?: number
  presentDays?: number
  lateDays?: number
  absentDays?: number
  homeworkRate?: number
  totalTodos?: number
  completedTodos?: number
}
