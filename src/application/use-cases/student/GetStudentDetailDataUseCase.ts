/**
 * Get Student Detail Data Use Case
 * 학생 상세 페이지 데이터 통합 조회 유스케이스 - Application Layer
 */

import { GetStudentDetailUseCase, type StudentDetailDTO } from './GetStudentDetailUseCase'
import { GetStudentScoresUseCase, type ExamScoreDTO } from './GetStudentScoresUseCase'
import { GetClassAveragesUseCase } from './GetClassAveragesUseCase'
import { GetStudentTodosUseCase, type StudentTodoDTO } from './GetStudentTodosUseCase'
import { GetStudentConsultationsUseCase, type ConsultationDTO } from './GetStudentConsultationsUseCase'
import { GetStudentAttendanceRecordsUseCase, type AttendanceRecordDTO } from './GetStudentAttendanceRecordsUseCase'
import { GetStudentInvoicesUseCase, type InvoiceDTO } from './GetStudentInvoicesUseCase'

export interface StudentDetailDataDTO {
  student: StudentDetailDTO
  recentScores: ExamScoreDTO[]
  classAverages: Record<string, number>
  recentTodos: StudentTodoDTO[]
  consultations: ConsultationDTO[]
  attendanceRecords: AttendanceRecordDTO[]
  invoices: InvoiceDTO[]
  kpis: {
    attendanceRate: number
    avgScore: number
    homeworkRate: number
  }
}

export class GetStudentDetailDataUseCase {
  private getStudentDetailUseCase: GetStudentDetailUseCase
  private getStudentScoresUseCase: GetStudentScoresUseCase
  private getClassAveragesUseCase: GetClassAveragesUseCase
  private getStudentTodosUseCase: GetStudentTodosUseCase
  private getStudentConsultationsUseCase: GetStudentConsultationsUseCase
  private getStudentAttendanceRecordsUseCase: GetStudentAttendanceRecordsUseCase
  private getStudentInvoicesUseCase: GetStudentInvoicesUseCase

  constructor() {
    this.getStudentDetailUseCase = new GetStudentDetailUseCase()
    this.getStudentScoresUseCase = new GetStudentScoresUseCase()
    this.getClassAveragesUseCase = new GetClassAveragesUseCase()
    this.getStudentTodosUseCase = new GetStudentTodosUseCase()
    this.getStudentConsultationsUseCase = new GetStudentConsultationsUseCase()
    this.getStudentAttendanceRecordsUseCase = new GetStudentAttendanceRecordsUseCase()
    this.getStudentInvoicesUseCase = new GetStudentInvoicesUseCase()
  }

  async execute(studentId: string): Promise<StudentDetailDataDTO> {
    // 병렬로 모든 데이터 조회
    const [
      student,
      recentScores,
      recentTodos,
      consultations,
      attendanceRecords,
      invoices,
    ] = await Promise.all([
      this.getStudentDetailUseCase.execute(studentId),
      this.getStudentScoresUseCase.execute(studentId),
      this.getStudentTodosUseCase.execute(studentId),
      this.getStudentConsultationsUseCase.execute(studentId),
      this.getStudentAttendanceRecordsUseCase.execute(studentId),
      this.getStudentInvoicesUseCase.execute(studentId),
    ])

    // 성적을 얻은 후 학급 평균 계산
    const classAverages = await this.getClassAveragesUseCase.execute(recentScores)

    // KPI 계산
    const kpis = this.calculateKPIs(attendanceRecords, recentScores, recentTodos)

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

  private calculateKPIs(
    attendanceRecords: AttendanceRecordDTO[],
    recentScores: ExamScoreDTO[],
    recentTodos: StudentTodoDTO[]
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
}
