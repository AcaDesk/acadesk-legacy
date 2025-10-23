/**
 * Report Repository Interface - Domain Layer
 *
 * Dependency Inversion Principle 적용
 */

import { Report, ReportType } from '../entities/Report'

export interface IReportRepository {
  /**
   * ID로 리포트 조회
   */
  findById(id: string): Promise<Report | null>

  /**
   * 학생별 리포트 목록 조회
   */
  findByStudentId(studentId: string, limit?: number): Promise<Report[]>

  /**
   * 클래스별 리포트 목록 조회
   */
  findByClassId(classId: string, limit?: number): Promise<Report[]>

  /**
   * 리포트 타입별 조회
   */
  findByType(type: ReportType, limit?: number): Promise<Report[]>

  /**
   * 리포트 저장
   */
  save(report: Report): Promise<void>

  /**
   * 리포트 삭제 (Soft Delete)
   */
  delete(id: string): Promise<void>
}
