/**
 * Generate Student Report Use Case - Application Layer
 *
 * 학생 리포트 생성
 */

import { Report, ReportType, ReportData } from '@core/domain/entities/Report'
import { IReportRepository } from '@core/domain/repositories/IReportRepository'
import { IDataSource } from '@core/domain/data-sources/IDataSource'
import { NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface GenerateStudentReportParams {
  studentId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  type: ReportType
  generatedBy: string // 생성자 (강사 ID)
  tenantId: string
  comment?: string
  academyName?: string
  academyPhone?: string
}

/**
 * 학생 리포트 생성 Use Case
 */
export class GenerateStudentReportUseCase {
  constructor(
    private reportRepository: IReportRepository,
    private dataSource: IDataSource
  ) {}

  async execute(params: GenerateStudentReportParams): Promise<Report> {
    try {
      // 1. 학생 정보 조회
      const student = await this.getStudentInfo(params.studentId)

      if (!student) {
        throw new NotFoundError('학생')
      }

      // 2. 데이터 수집 (병렬 처리)
      const [exams, attendance, todos, consultations, instructorName, chartPoints] = await Promise.all([
        this.getExamScores(params.studentId, params.startDate, params.endDate),
        this.getAttendance(params.studentId, params.startDate, params.endDate),
        this.getTodos(params.studentId, params.startDate, params.endDate),
        this.getConsultations(params.studentId, params.startDate, params.endDate),
        this.getInstructorName(params.generatedBy),
        this.getChartPoints(params.studentId, params.startDate),
      ])

      // 3. 통계 계산
      const avgScore =
        exams.length > 0
          ? Math.round(exams.reduce((sum: number, e: any) => sum + e.percentage, 0) / exams.length)
          : 0

      const attendanceRate =
        attendance.totalDays > 0
          ? Math.round((attendance.presentDays / attendance.totalDays) * 100)
          : 0

      const homeworkRate =
        todos.totalTodos > 0
          ? Math.round((todos.completedTodos / todos.totalTodos) * 100)
          : 0

      // 4. 리포트 월 계산 (YYYY-MM)
      const reportMonth = params.startDate.substring(0, 7) // YYYY-MM-DD -> YYYY-MM

      // 5. 성취율 계산 (간단 버전: 평균 성적, 출석률, 과제 완료율의 평균)
      const achievementRate = Math.round((avgScore + attendanceRate + homeworkRate) / 3)

      // 6. ReportData 구성
      const reportData: ReportData = {
        studentName: student.name,
        studentCode: student.studentCode,
        grade: student.grade,
        profileImageUrl: student.profileImageUrl,
        startDate: params.startDate,
        endDate: params.endDate,
        reportMonth,
        exams,
        avgScore,
        attendanceRate,
        totalDays: attendance.totalDays,
        presentDays: attendance.presentDays,
        lateDays: attendance.lateDays,
        absentDays: attendance.absentDays,
        homeworkRate,
        totalTodos: todos.totalTodos,
        completedTodos: todos.completedTodos,
        achievementRate,
        chartPoints: chartPoints.length > 0 ? chartPoints : undefined,
        consultations,
        overallComment: params.comment,
        academyName: params.academyName,
        academyPhone: params.academyPhone,
        instructorName,
      }

      // 5. Report 엔티티 생성
      const report = new Report(
        crypto.randomUUID(),
        params.tenantId,
        params.type,
        params.studentId,
        null,
        reportData,
        params.generatedBy,
        new Date()
      )

      // 6. 리포트 저장
      await this.reportRepository.save(report)

      return report
    } catch (error) {
      logError(error, {
        useCase: 'GenerateStudentReportUseCase',
        studentId: params.studentId,
      })
      throw error
    }
  }

  private async getStudentInfo(studentId: string) {
    const { data, error } = await this.dataSource
      .from('students')
      .select('id, student_code, grade, profile_image_url, users(name)')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      name: (data.users as any)?.name || '이름 없음',
      studentCode: data.student_code,
      grade: data.grade,
      profileImageUrl: data.profile_image_url,
    }
  }

  private async getExamScores(studentId: string, startDate: string, endDate: string) {
    const { data, error } = await this.dataSource
      .from('exam_scores')
      .select(
        `
        id,
        score,
        percentage,
        exams (
          name,
          exam_date
        )
      `
      )
      .eq('student_id', studentId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      logError(error, { method: 'getExamScores', studentId })
      return []
    }

    return (
      (data as any[])?.map((row: any) => ({
        name: row.exams?.name || '시험명 없음',
        date: row.exams?.exam_date || '',
        score: row.score || 0,
        percentage: row.percentage || 0,
      })) || []
    )
  }

  private async getAttendance(studentId: string, startDate: string, endDate: string) {
    const { data, error } = await this.dataSource
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      logError(error, { method: 'getAttendance', studentId })
      return { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0 }
    }

    const records = (data as any[]) || []
    const totalDays = records.length
    const presentDays = records.filter((r: any) => r.status === 'present').length
    const lateDays = records.filter((r: any) => r.status === 'late').length
    const absentDays = records.filter((r: any) => r.status === 'absent').length

    return { totalDays, presentDays, lateDays, absentDays }
  }

  private async getTodos(studentId: string, startDate: string, endDate: string) {
    const { data, error } = await this.dataSource
      .from('student_todos')
      .select('id, completed_at')
      .eq('student_id', studentId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      logError(error, { method: 'getTodos', studentId })
      return { totalTodos: 0, completedTodos: 0 }
    }

    const todos = (data as any[]) || []
    const totalTodos = todos.length
    const completedTodos = todos.filter((t: any) => t.completed_at).length

    return { totalTodos, completedTodos }
  }

  private async getConsultations(studentId: string, startDate: string, endDate: string) {
    const { data, error } = await this.dataSource
      .from('consultations')
      .select('consultation_date, consultation_type, summary')
      .eq('student_id', studentId)
      .gte('consultation_date', startDate)
      .lte('consultation_date', endDate)
      .order('consultation_date', { ascending: false })
      .limit(5)

    if (error) {
      logError(error, { method: 'getConsultations', studentId })
      return []
    }

    return (
      (data as any[])?.map((c: any) => ({
        date: c.consultation_date,
        type: c.consultation_type || '일반',
        summary: c.summary || '',
      })) || []
    )
  }

  private async getInstructorName(instructorId: string): Promise<string | undefined> {
    const { data, error } = await this.dataSource
      .from('users')
      .select('name')
      .eq('id', instructorId)
      .maybeSingle()

    if (error || !data) return undefined
    return (data as any).name
  }

  /**
   * 최근 6개월 간의 리포트 데이터를 조회하여 성장 그래프 포인트 생성
   */
  private async getChartPoints(studentId: string, currentStartDate: string): Promise<Array<{
    month: string
    avgScore: number
    attendanceRate: number
    homeworkRate: number
    achievementRate?: number
  }>> {
    // 현재 리포트 기준 최근 6개월 전까지 조회
    const sixMonthsAgo = new Date(currentStartDate)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const fromDate = sixMonthsAgo.toISOString().split('T')[0]

    const { data, error } = await this.dataSource
      .from('reports')
      .select('data, created_at')
      .eq('student_id', studentId)
      .gte('created_at', fromDate)
      .order('created_at', { ascending: true })
      .limit(6)

    if (error) {
      logError(error, { method: 'getChartPoints', studentId })
      return []
    }

    const chartData = (data as any[]) || []

    if (chartData.length === 0) {
      return []
    }

    return chartData.map((row: any) => {
      const reportData = row.data as ReportData
      return {
        month: reportData.reportMonth || reportData.startDate.substring(0, 7),
        avgScore: reportData.avgScore || 0,
        attendanceRate: reportData.attendanceRate || 0,
        homeworkRate: reportData.homeworkRate || 0,
        achievementRate: reportData.achievementRate,
      }
    })
  }
}
