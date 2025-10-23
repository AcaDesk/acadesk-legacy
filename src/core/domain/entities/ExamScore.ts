/**
 * ExamScore Entity
 * 시험 성적 도메인 엔티티 - 비즈니스 로직 포함
 */

import { Score } from '../value-objects/Score'

export interface ExamScoreProps {
  id: string
  tenantId: string
  examId: string
  studentId: string
  score: Score
  feedback: string | null
  isRetest: boolean
  retestCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class ExamScore {
  private constructor(private props: ExamScoreProps) {}

  static create(
    props: Omit<ExamScoreProps, 'id' | 'isRetest' | 'retestCount' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string }
  ): ExamScore {
    const now = new Date()
    return new ExamScore({
      ...props,
      id: props.id || crypto.randomUUID(),
      isRetest: false,
      retestCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: ExamScoreProps): ExamScore {
    return new ExamScore(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get examId(): string {
    return this.props.examId
  }

  get studentId(): string {
    return this.props.studentId
  }

  get score(): Score {
    return this.props.score
  }

  get feedback(): string | null {
    return this.props.feedback
  }

  get isRetest(): boolean {
    return this.props.isRetest
  }

  get retestCount(): number {
    return this.props.retestCount
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  // Business Logic Methods

  /**
   * 득점률 조회
   */
  getPercentage(): number {
    return this.props.score.getPercentageInt()
  }

  /**
   * 합격 여부
   */
  isPassed(threshold: number = 70): boolean {
    return this.props.score.isPassed(threshold)
  }

  /**
   * 등급 조회
   */
  getGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    return this.props.score.getGrade()
  }

  /**
   * 피드백 업데이트
   */
  updateFeedback(feedback: string): ExamScore {
    return new ExamScore({
      ...this.props,
      feedback,
      updatedAt: new Date(),
    })
  }

  /**
   * 점수 업데이트
   */
  updateScore(score: Score): ExamScore {
    return new ExamScore({
      ...this.props,
      score,
      updatedAt: new Date(),
    })
  }

  /**
   * 재시험으로 표시
   */
  markAsRetest(): ExamScore {
    return new ExamScore({
      ...this.props,
      isRetest: true,
      retestCount: this.props.retestCount + 1,
      updatedAt: new Date(),
    })
  }

  /**
   * 소프트 삭제
   */
  softDelete(): ExamScore {
    return new ExamScore({
      ...this.props,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * 데이터베이스 저장용 Plain Object로 변환
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.props.id,
      tenant_id: this.props.tenantId,
      exam_id: this.props.examId,
      student_id: this.props.studentId,
      score: this.props.score.getCorrect(),
      total_points: this.props.score.getTotal(),
      percentage: this.props.score.getPercentage(),
      feedback: this.props.feedback,
      is_retest: this.props.isRetest,
      retest_count: this.props.retestCount,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString(),
    }
  }

  /**
   * DTO로 변환 (UI 레이어용)
   */
  toDTO(): ExamScoreDTO {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      examId: this.props.examId,
      studentId: this.props.studentId,
      correctAnswers: this.props.score.getCorrect(),
      totalQuestions: this.props.score.getTotal(),
      percentage: this.props.score.getPercentage(),
      percentageInt: this.props.score.getPercentageInt(),
      grade: this.props.score.getGrade(),
      isPassed: this.isPassed(),
      feedback: this.props.feedback,
      isRetest: this.props.isRetest,
      retestCount: this.props.retestCount,
      scoreDisplay: this.props.score.toFractionString(),
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}

export interface ExamScoreDTO {
  id: string
  tenantId: string
  examId: string
  studentId: string
  correctAnswers: number
  totalQuestions: number
  percentage: number
  percentageInt: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  isPassed: boolean
  feedback: string | null
  isRetest: boolean
  retestCount: number
  scoreDisplay: string // "30/32" 형식
  createdAt: Date
  updatedAt: Date
}
