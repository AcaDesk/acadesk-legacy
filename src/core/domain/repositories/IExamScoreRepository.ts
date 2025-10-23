/**
 * ExamScore Repository Interface
 * 시험 성적 리포지토리 인터페이스 - 도메인 레이어에 속함
 * 의존성 역전 원칙(DIP): 도메인이 인프라에 의존하지 않도록 인터페이스 정의
 */

import type { ExamScore } from '../entities/ExamScore'

export interface ExamScoreFilters {
  examId?: string
  studentId?: string
  isPassed?: boolean
  minPercentage?: number
  maxPercentage?: number
}

export interface ExamScoreStats {
  total: number
  passed: number
  failed: number
  averagePercentage: number
  gradeDistribution: Record<'A' | 'B' | 'C' | 'D' | 'F', number>
}

export interface IExamScoreRepository {
  /**
   * ID로 성적 조회
   */
  findById(id: string): Promise<ExamScore | null>

  /**
   * ID로 성적 조회 (없으면 에러 발생)
   */
  findByIdOrThrow(id: string): Promise<ExamScore>

  /**
   * 시험 ID로 모든 성적 조회
   */
  findByExamId(examId: string, filters?: ExamScoreFilters): Promise<ExamScore[]>

  /**
   * 학생 ID로 모든 성적 조회
   */
  findByStudentId(studentId: string): Promise<ExamScore[]>

  /**
   * 테넌트의 모든 성적 조회
   */
  findAll(tenantId: string, filters?: ExamScoreFilters, limit?: number): Promise<ExamScore[]>

  /**
   * 특정 시험의 특정 학생 성적 조회
   */
  findByExamAndStudent(examId: string, studentId: string): Promise<ExamScore | null>

  /**
   * 성적 저장 (생성 or 업데이트)
   */
  save(examScore: ExamScore): Promise<ExamScore>

  /**
   * 성적 일괄 저장
   */
  saveBulk(examScores: ExamScore[]): Promise<ExamScore[]>

  /**
   * 성적 삭제
   */
  delete(id: string): Promise<void>

  /**
   * 시험별 통계 조회
   */
  getStatsByExam(examId: string): Promise<ExamScoreStats>

  /**
   * 학생별 통계 조회
   */
  getStatsByStudent(studentId: string): Promise<ExamScoreStats>

  /**
   * 특정 득점률 이하 학생들 조회
   */
  findLowPerformers(examId: string, threshold: number): Promise<ExamScore[]>
}
