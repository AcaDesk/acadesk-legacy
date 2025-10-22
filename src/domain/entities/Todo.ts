/**
 * Todo Entity
 * 학생 TODO 도메인 엔티티 - 비즈니스 로직 포함
 */

import { Priority, type PriorityLevel } from '../value-objects/Priority'

export interface TodoProps {
  id: string
  tenantId: string
  studentId: string
  title: string
  description: string | null
  subject: string | null
  dueDate: Date
  dueDayOfWeek: number
  priority: Priority
  estimatedDurationMinutes: number | null
  completedAt: Date | null
  verifiedAt: Date | null
  verifiedBy: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Todo {
  private constructor(private props: TodoProps) {}

  static create(props: Omit<TodoProps, 'id' | 'dueDayOfWeek' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'completedAt' | 'verifiedAt' | 'verifiedBy'> & { id?: string }): Todo {
    const now = new Date()
    const dueDayOfWeek = props.dueDate.getDay()

    return new Todo({
      ...props,
      id: props.id || crypto.randomUUID(),
      dueDayOfWeek,
      completedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: TodoProps): Todo {
    return new Todo(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get studentId(): string {
    return this.props.studentId
  }

  get title(): string {
    return this.props.title
  }

  get description(): string | null {
    return this.props.description
  }

  get subject(): string | null {
    return this.props.subject
  }

  get dueDate(): Date {
    return this.props.dueDate
  }

  get priority(): Priority {
    return this.props.priority
  }

  get estimatedDurationMinutes(): number | null {
    return this.props.estimatedDurationMinutes
  }

  get completedAt(): Date | null {
    return this.props.completedAt
  }

  get verifiedAt(): Date | null {
    return this.props.verifiedAt
  }

  get notes(): string | null {
    return this.props.notes
  }

  get isCompleted(): boolean {
    return this.props.completedAt !== null
  }

  get isVerified(): boolean {
    return this.props.verifiedAt !== null
  }

  get isPending(): boolean {
    return !this.isCompleted
  }

  get isOverdue(): boolean {
    if (this.isCompleted) return false
    return this.props.dueDate < new Date()
  }

  // Business Logic Methods

  /**
   * D-Day 계산
   */
  getDaysUntilDue(): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(this.props.dueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * TODO 완료 처리
   */
  complete(): Todo {
    if (this.isCompleted) {
      throw new Error('이미 완료된 TODO입니다')
    }

    return new Todo({
      ...this.props,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * TODO 완료 취소
   */
  uncomplete(): Todo {
    if (!this.isCompleted) {
      throw new Error('완료되지 않은 TODO입니다')
    }

    if (this.isVerified) {
      throw new Error('검증된 TODO는 완료 취소할 수 없습니다')
    }

    return new Todo({
      ...this.props,
      completedAt: null,
      updatedAt: new Date(),
    })
  }

  /**
   * TODO 검증 처리 (선생님 확인)
   */
  verify(verifiedBy: string): Todo {
    if (!this.isCompleted) {
      throw new Error('완료되지 않은 TODO는 검증할 수 없습니다')
    }

    if (this.isVerified) {
      throw new Error('이미 검증된 TODO입니다')
    }

    return new Todo({
      ...this.props,
      verifiedAt: new Date(),
      verifiedBy,
      updatedAt: new Date(),
    })
  }

  /**
   * TODO 정보 업데이트
   */
  update(updates: Partial<Pick<TodoProps, 'title' | 'description' | 'subject' | 'dueDate' | 'priority' | 'estimatedDurationMinutes' | 'notes'>>): Todo {
    const newDueDayOfWeek = updates.dueDate ? updates.dueDate.getDay() : this.props.dueDayOfWeek

    return new Todo({
      ...this.props,
      ...updates,
      dueDayOfWeek: newDueDayOfWeek,
      updatedAt: new Date(),
    })
  }

  /**
   * 우선순위 변경
   */
  changePriority(priority: Priority): Todo {
    return new Todo({
      ...this.props,
      priority,
      updatedAt: new Date(),
    })
  }

  /**
   * 소프트 삭제
   */
  softDelete(): Todo {
    return new Todo({
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
      student_id: this.props.studentId,
      title: this.props.title,
      description: this.props.description,
      subject: this.props.subject,
      due_date: this.props.dueDate.toISOString().split('T')[0], // YYYY-MM-DD
      due_day_of_week: this.props.dueDayOfWeek,
      priority: this.props.priority.getValue(),
      estimated_duration_minutes: this.props.estimatedDurationMinutes,
      completed_at: this.props.completedAt?.toISOString(),
      verified_at: this.props.verifiedAt?.toISOString(),
      verified_by: this.props.verifiedBy,
      notes: this.props.notes,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString(),
    }
  }

  /**
   * DTO로 변환 (UI 레이어용)
   */
  toDTO(): TodoDTO {
    return {
      id: this.props.id,
      title: this.props.title,
      description: this.props.description,
      subject: this.props.subject,
      dueDate: this.props.dueDate,
      daysUntilDue: this.getDaysUntilDue(),
      priority: this.props.priority.getValue(),
      priorityKorean: this.props.priority.toKorean(),
      estimatedDurationMinutes: this.props.estimatedDurationMinutes,
      isCompleted: this.isCompleted,
      isVerified: this.isVerified,
      isOverdue: this.isOverdue,
      completedAt: this.props.completedAt,
      verifiedAt: this.props.verifiedAt,
    }
  }
}

export interface TodoDTO {
  id: string
  title: string
  description: string | null
  subject: string | null
  dueDate: Date
  daysUntilDue: number
  priority: PriorityLevel
  priorityKorean: string
  estimatedDurationMinutes: number | null
  isCompleted: boolean
  isVerified: boolean
  isOverdue: boolean
  completedAt: Date | null
  verifiedAt: Date | null
}
