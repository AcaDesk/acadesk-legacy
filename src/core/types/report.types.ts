/**
 * Report Types
 * 리포트 관련 타입 정의
 */

export interface ReportData {
  student: {
    id: string
    name: string
    grade: string
    student_code: string
  }
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
    tests: Array<{
      name: string
      date: string
      percentage: number
      feedback: string | null
    }>
  }[]
  instructorComment: string
  // Chart data
  gradesChartData: Array<{
    examName: string
    score: number
    classAverage?: number
    date?: string
  }>
  attendanceChartData: Array<{
    date: Date
    status: 'present' | 'late' | 'absent' | 'none'
    note?: string
  }>
}
