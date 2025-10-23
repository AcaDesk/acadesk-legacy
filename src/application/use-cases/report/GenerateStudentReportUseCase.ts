/**
 * Generate Student Report Use Case - Application Layer
 *
 * 학생 리포트 생성
 */

import { Report, ReportType, ReportData } from '@/domain/entities/Report'
import { IReportRepository } from '@/domain/repositories/IReportRepository'
import { IDataSource } from '@/domain/data-sources/IDataSource'
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
      const [exams, attendance, todos, consultations] = await Promise.all([
        this.getExamScores(params.studentId, params.startDate, params.endDate),
        this.getAttendance(params.studentId, params.startDate, params.endDate),
        this.getTodos(params.studentId, params.startDate, params.endDate),
        this.getConsultations(params.studentId, params.startDate, params.endDate),
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

      // 4. ReportData 구성
      const reportData: ReportData = {
        studentName: student.name,
        studentCode: student.studentCode,
        grade: student.grade,
        startDate: params.startDate,
        endDate: params.endDate,
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
        consultations,
        overallComment: params.comment,
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
      .select('id, student_code, grade, users(name)')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      name: (data.users as any)?.name || '이름 없음',
      studentCode: data.student_code,
      grade: data.grade,
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
}
