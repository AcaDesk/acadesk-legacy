/**
 * Exam Entity
 * 시험 도메인 엔티티 - 비즈니스 로직 포함
 */

export interface ExamProps {
  id: string
  tenantId: string
  classId: string | null
  name: string
  categoryCode: string
  examDate: Date | null
  totalQuestions: number | null
  description: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Exam {
  private constructor(private props: ExamProps) {}

  static create(
    props: Omit<ExamProps, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string }
  ): Exam {
    const now = new Date()
    return new Exam({
      ...props,
      id: props.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: ExamProps): Exam {
    return new Exam(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get classId(): string | null {
    return this.props.classId
  }

  get name(): string {
    return this.props.name
  }

  get categoryCode(): string {
    return this.props.categoryCode
  }

  get examDate(): Date | null {
    return this.props.examDate
  }

  get totalQuestions(): number | null {
    return this.props.totalQuestions
  }

  get description(): string | null {
    return this.props.description
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null
  }

  // Business Logic Methods

  /**
   * 시험 정보 업데이트
   */
  update(
    updates: Partial<Pick<ExamProps, 'name' | 'categoryCode' | 'examDate' | 'totalQuestions' | 'description' | 'classId'>>
  ): Exam {
    return new Exam({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * 시험 날짜가 지났는지 확인
   */
  isPast(): boolean {
    if (!this.props.examDate) return false
    return this.props.examDate < new Date()
  }

  /**
   * 시험까지 남은 일수
   */
  getDaysUntilExam(): number | null {
    if (!this.props.examDate) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const examDate = new Date(this.props.examDate)
    examDate.setHours(0, 0, 0, 0)

    const diffTime = examDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 소프트 삭제
   */
  softDelete(): Exam {
    return new Exam({
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
      class_id: this.props.classId,
      name: this.props.name,
      category_code: this.props.categoryCode,
      exam_date: this.props.examDate?.toISOString(),
      total_questions: this.props.totalQuestions,
      description: this.props.description,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString(),
    }
  }

  /**
   * DTO로 변환 (UI 레이어용)
   */
  toDTO(): ExamDTO {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      classId: this.props.classId,
      name: this.props.name,
      categoryCode: this.props.categoryCode,
      examDate: this.props.examDate,
      totalQuestions: this.props.totalQuestions,
      description: this.props.description,
      isPast: this.isPast(),
      daysUntilExam: this.getDaysUntilExam(),
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}

export interface ExamDTO {
  id: string
  tenantId: string
  classId: string | null
  name: string
  categoryCode: string
  examDate: Date | null
  totalQuestions: number | null
  description: string | null
  isPast: boolean
  daysUntilExam: number | null
  createdAt: Date
  updatedAt: Date
}
