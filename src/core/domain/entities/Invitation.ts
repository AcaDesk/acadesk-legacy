/**
 * Invitation Entity
 * 초대장 도메인 엔티티
 *
 * MVP: 현재 미사용 (추후 구현 예정)
 */

import { InvitationToken } from '@core/domain/value-objects/InvitationToken'
import { Email } from '@core/domain/value-objects/Email'
import type { UserRole } from './User'

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface InvitationDTO {
  id: string
  tenantId: string
  invitedBy: string
  email: string
  roleCode: UserRole
  token: string
  status: InvitationStatus
  expiresAt: string
  acceptedAt: string | null
  acceptedBy: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateInvitationProps {
  id?: string
  tenantId: string
  invitedBy: string
  email: Email
  roleCode: UserRole
  token?: InvitationToken
  expiresAt?: Date
  status?: InvitationStatus
  acceptedAt?: Date | null
  acceptedBy?: string | null
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

/**
 * Invitation Domain Entity
 */
export class Invitation {
  private static readonly DEFAULT_EXPIRY_DAYS = 7

  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly invitedBy: string,
    private readonly email: Email,
    private readonly roleCode: UserRole,
    private readonly token: InvitationToken,
    private readonly status: InvitationStatus,
    private readonly expiresAt: Date,
    private readonly acceptedAt: Date | null,
    private readonly acceptedBy: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
    private readonly deletedAt: Date | null
  ) {}

  /**
   * Create new Invitation
   */
  static create(props: CreateInvitationProps): Invitation {
    const now = new Date()
    const defaultExpiryDate = new Date(
      now.getTime() + Invitation.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    )

    return new Invitation(
      props.id ?? crypto.randomUUID(),
      props.tenantId,
      props.invitedBy,
      props.email,
      props.roleCode,
      props.token ?? InvitationToken.generate(),
      props.status ?? 'pending',
      props.expiresAt ?? defaultExpiryDate,
      props.acceptedAt ?? null,
      props.acceptedBy ?? null,
      props.createdAt ?? now,
      props.updatedAt ?? now,
      props.deletedAt ?? null
    )
  }

  // ==================== Getters ====================

  getId(): string {
    return this.id
  }

  getTenantId(): string {
    return this.tenantId
  }

  getInvitedBy(): string {
    return this.invitedBy
  }

  getEmail(): Email {
    return this.email
  }

  getRoleCode(): UserRole {
    return this.roleCode
  }

  getToken(): InvitationToken {
    return this.token
  }

  getStatus(): InvitationStatus {
    return this.status
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  getAcceptedAt(): Date | null {
    return this.acceptedAt
  }

  getAcceptedBy(): string | null {
    return this.acceptedBy
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  getDeletedAt(): Date | null {
    return this.deletedAt
  }

  // ==================== Business Logic ====================

  /**
   * Check if invitation is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  /**
   * Check if invitation is pending
   */
  isPending(): boolean {
    return this.status === 'pending'
  }

  /**
   * Check if invitation is accepted
   */
  isAccepted(): boolean {
    return this.status === 'accepted'
  }

  /**
   * Check if invitation is rejected
   */
  isRejected(): boolean {
    return this.status === 'rejected'
  }

  /**
   * Check if invitation is valid (pending and not expired)
   */
  isValid(): boolean {
    return this.isPending() && !this.isExpired()
  }

  /**
   * Check if invitation is deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null
  }

  /**
   * Get days until expiry
   */
  getDaysUntilExpiry(): number {
    const now = new Date()
    const diff = this.expiresAt.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if invitation is for staff role
   */
  isStaffInvitation(): boolean {
    return this.roleCode === 'owner' || this.roleCode === 'instructor' || this.roleCode === 'assistant'
  }

  /**
   * Check if invitation is for parent
   */
  isParentInvitation(): boolean {
    return this.roleCode === 'parent'
  }

  // ==================== State Changes ====================

  /**
   * Accept invitation
   */
  accept(userId: string): Invitation {
    if (!this.isValid()) {
      throw new Error('유효하지 않은 초대장입니다.')
    }

    return new Invitation(
      this.id,
      this.tenantId,
      this.invitedBy,
      this.email,
      this.roleCode,
      this.token,
      'accepted',
      this.expiresAt,
      new Date(),
      userId,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Reject invitation
   */
  reject(): Invitation {
    if (!this.isValid()) {
      throw new Error('유효하지 않은 초대장입니다.')
    }

    return new Invitation(
      this.id,
      this.tenantId,
      this.invitedBy,
      this.email,
      this.roleCode,
      this.token,
      'rejected',
      this.expiresAt,
      null,
      null,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Mark as expired
   */
  expire(): Invitation {
    return new Invitation(
      this.id,
      this.tenantId,
      this.invitedBy,
      this.email,
      this.roleCode,
      this.token,
      'expired',
      this.expiresAt,
      this.acceptedAt,
      this.acceptedBy,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Extend expiry date
   */
  extendExpiry(days: number): Invitation {
    const newExpiryDate = new Date(this.expiresAt.getTime() + days * 24 * 60 * 60 * 1000)

    return new Invitation(
      this.id,
      this.tenantId,
      this.invitedBy,
      this.email,
      this.roleCode,
      this.token,
      this.status,
      newExpiryDate,
      this.acceptedAt,
      this.acceptedBy,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Soft delete invitation
   */
  delete(): Invitation {
    return new Invitation(
      this.id,
      this.tenantId,
      this.invitedBy,
      this.email,
      this.roleCode,
      this.token,
      this.status,
      this.expiresAt,
      this.acceptedAt,
      this.acceptedBy,
      this.createdAt,
      new Date(),
      new Date()
    )
  }

  // ==================== DTO Conversion ====================

  /**
   * Convert to DTO for API responses
   */
  toDTO(): InvitationDTO {
    return {
      id: this.id,
      tenantId: this.tenantId,
      invitedBy: this.invitedBy,
      email: this.email.getValue(),
      roleCode: this.roleCode,
      token: this.token.getValue(),
      status: this.status,
      expiresAt: this.expiresAt.toISOString(),
      acceptedAt: this.acceptedAt?.toISOString() ?? null,
      acceptedBy: this.acceptedBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() ?? null,
    }
  }

  /**
   * Convert to public DTO (hide sensitive info like token)
   */
  toPublicDTO(): Omit<InvitationDTO, 'token'> & { tokenMasked: string } {
    return {
      id: this.id,
      tenantId: this.tenantId,
      invitedBy: this.invitedBy,
      email: this.email.mask(),
      roleCode: this.roleCode,
      tokenMasked: this.token.getMasked(),
      status: this.status,
      expiresAt: this.expiresAt.toISOString(),
      acceptedAt: this.acceptedAt?.toISOString() ?? null,
      acceptedBy: this.acceptedBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() ?? null,
    }
  }
}
