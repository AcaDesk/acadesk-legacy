/**
 * TodoTemplate Entity
 * TODO 템플릿 도메인 엔티티
 */

import { Priority, type PriorityLevel } from '../value-objects/Priority'

export interface TodoTemplateProps {
  id: string
  tenantId: string
  title: string
  description: string | null
  subject: string | null
  estimatedDurationMinutes: number | null
  priority: Priority
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export class TodoTemplate {
  private constructor(private props: TodoTemplateProps) {}

  static create(
    props: Omit<TodoTemplateProps, 'id' | 'active' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): TodoTemplate {
    const now = new Date()

    return new TodoTemplate({
      ...props,
      id: props.id || crypto.randomUUID(),
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  static fromDatabase(props: TodoTemplateProps): TodoTemplate {
    return new TodoTemplate(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
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

  get estimatedDurationMinutes(): number | null {
    return this.props.estimatedDurationMinutes
  }

  get priority(): Priority {
    return this.props.priority
  }

  get active(): boolean {
    return this.props.active
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  // Business Logic Methods

  /**
   * 템플릿 정보 업데이트
   */
  update(
    updates: Partial<
      Pick<
        TodoTemplateProps,
        'title' | 'description' | 'subject' | 'estimatedDurationMinutes' | 'priority'
      >
    >
  ): TodoTemplate {
    return new TodoTemplate({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * 템플릿 비활성화
   */
  deactivate(): TodoTemplate {
    return new TodoTemplate({
      ...this.props,
      active: false,
      updatedAt: new Date(),
    })
  }

  /**
   * 템플릿 활성화
   */
  activate(): TodoTemplate {
    return new TodoTemplate({
      ...this.props,
      active: true,
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
      title: this.props.title,
      description: this.props.description,
      subject: this.props.subject,
      estimated_duration_minutes: this.props.estimatedDurationMinutes,
      priority: this.props.priority.getValue(),
      active: this.props.active,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  /**
   * DTO로 변환 (UI 레이어용)
   */
  toDTO(): TodoTemplateDTO {
    return {
      id: this.props.id,
      title: this.props.title,
      description: this.props.description,
      subject: this.props.subject,
      estimatedDurationMinutes: this.props.estimatedDurationMinutes,
      priority: this.props.priority.getValue(),
      priorityKorean: this.props.priority.toKorean(),
      active: this.props.active,
    }
  }
}

export interface TodoTemplateDTO {
  id: string
  title: string
  description: string | null
  subject: string | null
  estimatedDurationMinutes: number | null
  priority: PriorityLevel
  priorityKorean: string
  active: boolean
}
