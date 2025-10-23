/**
 * Class Entity
 * 수업(반) 도메인 엔터티
 */

export interface ClassProps {
  id: string
  tenantId: string
  name: string
  description: string | null
  instructorId: string | null
  subject: string | null
  subjectId: string | null
  gradeLevel: string | null
  capacity: number | null
  schedule: Record<string, unknown> | null
  room: string | null
  status: string
  active: boolean
  meta: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Class {
  private constructor(private readonly props: ClassProps) {}

  static create(props: Omit<ClassProps, 'createdAt' | 'updatedAt' | 'deletedAt'>): Class {
    return new Class({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
  }

  static fromDatabase(data: Record<string, unknown>): Class {
    return new Class({
      id: data.id as string,
      tenantId: data.tenant_id as string,
      name: data.name as string,
      description: (data.description as string) || null,
      instructorId: (data.instructor_id as string) || null,
      subject: (data.subject as string) || null,
      subjectId: (data.subject_id as string) || null,
      gradeLevel: (data.grade_level as string) || null,
      capacity: (data.capacity as number) || null,
      schedule: (data.schedule as Record<string, unknown>) || null,
      room: (data.room as string) || null,
      status: (data.status as string) || 'active',
      active: (data.active as boolean) ?? true,
      meta: (data.meta as Record<string, unknown>) || {},
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      deletedAt: data.deleted_at ? new Date(data.deleted_at as string) : null,
    })
  }

  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | null {
    return this.props.description
  }

  get instructorId(): string | null {
    return this.props.instructorId
  }

  get subject(): string | null {
    return this.props.subject
  }

  get subjectId(): string | null {
    return this.props.subjectId
  }

  get gradeLevel(): string | null {
    return this.props.gradeLevel
  }

  get capacity(): number | null {
    return this.props.capacity
  }

  get schedule(): Record<string, unknown> | null {
    return this.props.schedule
  }

  get room(): string | null {
    return this.props.room
  }

  get status(): string {
    return this.props.status
  }

  get active(): boolean {
    return this.props.active
  }

  get meta(): Record<string, unknown> {
    return this.props.meta
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt
  }

  isActive(): boolean {
    return this.props.active && this.props.status === 'active' && !this.props.deletedAt
  }

  toJSON(): ClassProps {
    return { ...this.props }
  }
}
