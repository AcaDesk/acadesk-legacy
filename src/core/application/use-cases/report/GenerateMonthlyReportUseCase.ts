/**
 * Generate Monthly Report Use Case
 * 월간 리포트 생성 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/error-types'

export interface ReportData {
  student: {
    id: string
    name: string
    grade: string
    student_code: string
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

interface StudentDataWithUser {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
  }[] | null
}

export class GenerateMonthlyReportUseCase {
  private supabase = createClient()

  async execute(studentId: string, year: number, month: number): Promise<ReportData> {
    // 기간 설정
    const periodStart = new Date(year, month - 1, 1)
    const periodEnd = new Date(year, month, 0)
    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // 이전 달 기간
    const prevPeriodStart = new Date(year, month - 2, 1)
    const prevPeriodEnd = new Date(year, month - 1, 0)
    const prevPeriodStartStr = prevPeriodStart.toISOString().split('T')[0]
    const prevPeriodEndStr = prevPeriodEnd.toISOString().split('T')[0]

    // 학생 정보 조회
    const { data: studentData } = await this.supabase
      .from('students')
      .select('id, student_code, grade, users(name)')
      .eq('id', studentId)
      .single()

    if (!studentData) throw new DatabaseError('학생을 찾을 수 없습니다.')

    // 출석 정보 조회
    const attendance = await this.getAttendanceData(studentId, periodStartStr, periodEndStr)

    // 숙제 완료율 조회
    const homework = await this.getHomeworkData(studentId, periodStartStr, periodEndStr)

    // 성적 정보 조회
    const scores = await this.getScoresData(
      studentId,
      periodStartStr,
      periodEndStr,
      prevPeriodStartStr,
      prevPeriodEndStr
    )

    // 강사 코멘트 생성
    const instructorComment = await this.generateInstructorComment(
      studentData,
      attendance,
      scores
    )

    // 차트 데이터 생성
    const gradesChartData = await this.getGradesChartData(studentId, periodStartStr, periodEndStr)
    const attendanceChartData = await this.getAttendanceChartData(
      studentId,
      periodStartStr,
      periodEndStr
    )

    return {
      student: {
        id: studentData.id,
        name: (studentData as unknown as StudentDataWithUser).users?.[0]?.name || 'Unknown',
        grade: studentData.grade || '',
        student_code: studentData.student_code,
      },
      period: {
        start: periodStartStr,
        end: periodEndStr,
      },
      attendance,
      homework,
      scores,
      instructorComment,
      gradesChartData,
      attendanceChartData,
    }
  }

  private async getAttendanceData(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ) {
    const { data } = await this.supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const total = data?.length || 0
    const present = data?.filter((a) => a.status === 'present').length || 0
    const late = data?.filter((a) => a.status === 'late').length || 0
    const absent = data?.filter((a) => a.status === 'absent').length || 0
    const rate = total > 0 ? Math.round((present / total) * 100) : 0

    return { total, present, late, absent, rate }
  }

  private async getHomeworkData(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ) {
    const { data } = await this.supabase
      .from('student_todos')
      .select('completed_at')
      .eq('student_id', studentId)
      .gte('due_date', periodStart)
      .lte('due_date', periodEnd)

    const total = data?.length || 0
    const completed = data?.filter((t) => t.completed_at !== null).length || 0
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, rate }
  }

  private async getScoresData(
    studentId: string,
    periodStart: string,
    periodEnd: string,
    prevPeriodStart: string,
    prevPeriodEnd: string
  ) {
    // 현재 기간 성적
    const { data: currentScores } = await this.supabase
      .from('exam_scores')
      .select(`
        percentage,
        feedback,
        exams (
          name,
          exam_date,
          category_code,
          ref_exam_categories (label)
        )
      `)
      .eq('student_id', studentId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false })

    // 이전 기간 성적
    const { data: previousScores } = await this.supabase
      .from('exam_scores')
      .select(`
        percentage,
        exams (category_code)
      `)
      .eq('student_id', studentId)
      .gte('created_at', prevPeriodStart)
      .lte('created_at', prevPeriodEnd)

    // 카테고리별로 그룹화
    interface CategoryDataMap {
      category: string
      tests: Array<{
        name: string
        date: string
        percentage: number
        feedback: string | null
      }>
      percentages: number[]
    }

    const categories = new Map<string, CategoryDataMap>()

    interface ExamScoreWithDetails {
      percentage: number
      feedback?: string | null
      exams?: {
        name: string
        exam_date: string
        category_code: string
        ref_exam_categories?: {
          label: string
        } | null
      } | null
    }

    currentScores?.forEach((score) => {
      const examScore = score as unknown as ExamScoreWithDetails
      const category = examScore.exams?.category_code || ''
      const label = examScore.exams?.ref_exam_categories?.label || category

      if (!categories.has(category)) {
        categories.set(category, {
          category: label,
          tests: [],
          percentages: [],
        })
      }

      const categoryData = categories.get(category)
      if (categoryData) {
        categoryData.tests.push({
          name: examScore.exams?.name || '',
          date: examScore.exams?.exam_date || '',
          percentage: examScore.percentage,
          feedback: examScore.feedback || null,
        })
        categoryData.percentages.push(examScore.percentage)
      }
    })

    // 이전 기간 평균 계산
    interface ExamScoreBasicType {
      percentage: number
      exams?: {
        category_code: string
      } | null
    }

    const prevAverages = new Map<string, number[]>()
    previousScores?.forEach((score) => {
      const examScore = score as unknown as ExamScoreBasicType
      const category = examScore.exams?.category_code || ''
      if (!prevAverages.has(category)) {
        prevAverages.set(category, [])
      }
      const categoryScores = prevAverages.get(category)
      if (categoryScores) {
        categoryScores.push(examScore.percentage)
      }
    })

    // 최종 결과 생성
    return Array.from(categories.entries()).map(([category, data]) => {
      const currentAvg =
        data.percentages.reduce((sum: number, p: number) => sum + p, 0) /
        data.percentages.length

      const prevScores = prevAverages.get(category) || []
      const previousAvg =
        prevScores.length > 0
          ? prevScores.reduce((sum, p) => sum + p, 0) / prevScores.length
          : null

      const change =
        previousAvg !== null ? Math.round((currentAvg - previousAvg) * 10) / 10 : null

      return {
        category: data.category,
        current: Math.round(currentAvg * 10) / 10,
        previous: previousAvg !== null ? Math.round(previousAvg * 10) / 10 : null,
        change,
        tests: data.tests,
      }
    })
  }

  private async generateInstructorComment(
    student: StudentDataWithUser,
    attendance: { total: number; present: number; late: number; absent: number; rate: number },
    scores: Array<{ category: string; current: number; previous: number | null; change: number | null; tests: unknown[] }>
  ): Promise<string> {
    const comments: string[] = []

    // 출석 관련 코멘트
    if (attendance.rate >= 95) {
      comments.push('출석률이 매우 우수합니다.')
    } else if (attendance.rate >= 85) {
      comments.push('출석률이 양호합니다.')
    } else {
      comments.push('출석에 더욱 신경 써주시기 바랍니다.')
    }

    // 성적 관련 코멘트
    const improvingCategories = scores.filter((s) => s.change && s.change > 5)
    const decliningCategories = scores.filter((s) => s.change && s.change < -5)

    if (improvingCategories.length > 0) {
      comments.push(
        `${improvingCategories.map((c) => c.category).join(', ')} 영역에서 눈에 띄는 향상을 보이고 있습니다.`
      )
    }

    if (decliningCategories.length > 0) {
      comments.push(
        `${decliningCategories.map((c) => c.category).join(', ')} 영역에 좀 더 집중이 필요합니다.`
      )
    }

    // 전반적인 평가
    const avgScore =
      scores.reduce((sum, s) => sum + s.current, 0) / (scores.length || 1)

    if (avgScore >= 90) {
      comments.push('전반적으로 매우 우수한 성취도를 보이고 있습니다.')
    } else if (avgScore >= 80) {
      comments.push('전반적으로 양호한 성취도를 보이고 있습니다.')
    } else {
      comments.push('전반적인 학습 성취도 향상을 위해 함께 노력하겠습니다.')
    }

    return comments.join(' ')
  }

  private async getGradesChartData(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ) {
    const { data: examScores } = await this.supabase
      .from('exam_scores')
      .select(`
        score,
        total_score,
        percentage,
        exams (
          name,
          exam_date
        )
      `)
      .eq('student_id', studentId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: true })

    if (!examScores || examScores.length === 0) {
      return []
    }

    interface ExamScoreChartType {
      score: number
      total_score: number
      percentage: number
      exams?: {
        name: string
        exam_date: string
      } | null
    }

    const chartData = examScores.map((examScore) => {
      const typedScore = examScore as unknown as ExamScoreChartType
      const examName = typedScore.exams?.name || '시험'
      const scoreValue = typedScore.percentage || 0
      const date = typedScore.exams?.exam_date

      return {
        examName,
        score: Math.round(scoreValue * 10) / 10,
        classAverage: undefined,
        date,
      }
    })

    return chartData
  }

  private async getAttendanceChartData(
    studentId: string,
    periodStart: string,
    periodEnd: string
  ) {
    const { data: attendanceRecords } = await this.supabase
      .from('attendance')
      .select('attendance_date, status, note')
      .eq('student_id', studentId)
      .gte('attendance_date', periodStart)
      .lte('attendance_date', periodEnd)
      .order('attendance_date', { ascending: true })

    if (!attendanceRecords) {
      return []
    }

    interface AttendanceRecordType {
      attendance_date: string
      status: 'present' | 'late' | 'absent' | 'none'
      note?: string | null
    }

    return attendanceRecords.map((record) => {
      const attendanceRecord = record as unknown as AttendanceRecordType
      return {
        date: new Date(attendanceRecord.attendance_date),
        status: attendanceRecord.status,
        note: attendanceRecord.note || undefined,
      }
    })
  }
}
