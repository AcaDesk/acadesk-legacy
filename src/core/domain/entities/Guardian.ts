/**
 * Guardian Domain Entity
 * 보호자 도메인 엔티티
 */

export type GuardianRelation =
  | 'father'
  | 'mother'
  | 'grandfather'
  | 'grandmother'
  | 'uncle'
  | 'aunt'
  | 'other'

interface GuardianProps {
  id: string
  tenantId: string
  userId?: string | null
  relationship?: string | null
  occupation?: string | null
  address?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class Guardian {
  private constructor(private readonly props: GuardianProps) {}

  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get userId(): string | null {
    return this.props.userId || null
  }

  get relationship(): string | null {
    return this.props.relationship || null
  }

  get occupation(): string | null {
    return this.props.occupation || null
  }

  get address(): string | null {
    return this.props.address || null
  }

  get notes(): string | null {
    return this.props.notes || null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt || null
  }

  /**
   * 보호자가 삭제되었는지 확인
   */
  isDeleted(): boolean {
    return this.props.deletedAt !== null && this.props.deletedAt !== undefined
  }

  /**
   * 데이터베이스 레코드로부터 Guardian 엔티티 생성
   */
  static fromDatabase(data: any): Guardian {
    return new Guardian({
      id: data.id,
      tenantId: data.tenant_id,
      userId: data.user_id,
      relationship: data.relationship,
      occupation: data.occupation,
      address: data.address,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
    })
  }

  /**
   * 데이터베이스 저장을 위한 형식으로 변환
   */
  toDatabase(): Record<string, any> {
    return {
      id: this.props.id,
      tenant_id: this.props.tenantId,
      user_id: this.props.userId,
      relationship: this.props.relationship,
      occupation: this.props.occupation,
      address: this.props.address,
      notes: this.props.notes,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString() || null,
    }
  }
}
