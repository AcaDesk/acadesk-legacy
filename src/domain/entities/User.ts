/**
 * User Entity
 * 사용자 도메인 엔티티
 */

import { Email } from '@/domain/value-objects/Email'

export type UserRole = 'owner' | 'instructor' | 'assistant' | 'parent' | 'student'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface UserDTO {
  id: string
  tenantId: string | null
  email: string
  name: string
  phone: string | null
  roleCode: UserRole | null
  onboardingCompleted: boolean
  onboardingCompletedAt: string | null
  approvalStatus: ApprovalStatus
  approvalReason: string | null
  approvedAt: string | null
  approvedBy: string | null
  settings: Record<string, unknown>
  preferences: Record<string, unknown>
  address: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateUserProps {
  id: string
  tenantId: string | null
  email: Email
  name: string
  phone?: string | null
  roleCode?: UserRole | null
  onboardingCompleted?: boolean
  onboardingCompletedAt?: Date | null
  approvalStatus?: ApprovalStatus
  approvalReason?: string | null
  approvedAt?: Date | null
  approvedBy?: string | null
  settings?: Record<string, unknown>
  preferences?: Record<string, unknown>
  address?: string | null
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

/**
 * User Domain Entity
 * 불변성을 보장하며 비즈니스 로직을 캡슐화
 */
export class User {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string | null,
    private readonly email: Email,
    private readonly name: string,
    private readonly phone: string | null,
    private readonly roleCode: UserRole | null,
    private readonly onboardingCompleted: boolean,
    private readonly onboardingCompletedAt: Date | null,
    private readonly approvalStatus: ApprovalStatus,
    private readonly approvalReason: string | null,
    private readonly approvedAt: Date | null,
    private readonly approvedBy: string | null,
    private readonly settings: Record<string, unknown>,
    private readonly preferences: Record<string, unknown>,
    private readonly address: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
    private readonly deletedAt: Date | null
  ) {}

  /**
   * Create new User
   */
  static create(props: CreateUserProps): User {
    return new User(
      props.id,
      props.tenantId,
      props.email,
      props.name,
      props.phone ?? null,
      props.roleCode ?? null,
      props.onboardingCompleted ?? false,
      props.onboardingCompletedAt ?? null,
      props.approvalStatus ?? 'pending',
      props.approvalReason ?? null,
      props.approvedAt ?? null,
      props.approvedBy ?? null,
      props.settings ?? {},
      props.preferences ?? {},
      props.address ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.deletedAt ?? null
    )
  }

  // ==================== Getters ====================

  getId(): string {
    return this.id
  }

  getTenantId(): string | null {
    return this.tenantId
  }

  getEmail(): Email {
    return this.email
  }

  getName(): string {
    return this.name
  }

  getPhone(): string | null {
    return this.phone
  }

  getRoleCode(): UserRole | null {
    return this.roleCode
  }

  getOnboardingCompleted(): boolean {
    return this.onboardingCompleted
  }

  getOnboardingCompletedAt(): Date | null {
    return this.onboardingCompletedAt
  }

  getApprovalStatus(): ApprovalStatus {
    return this.approvalStatus
  }

  getApprovalReason(): string | null {
    return this.approvalReason
  }

  getApprovedAt(): Date | null {
    return this.approvedAt
  }

  getApprovedBy(): string | null {
    return this.approvedBy
  }

  getSettings(): Record<string, unknown> {
    return { ...this.settings }
  }

  getPreferences(): Record<string, unknown> {
    return { ...this.preferences }
  }

  getAddress(): string | null {
    return this.address
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
   * Check if user is an owner
   */
  isOwner(): boolean {
    return this.roleCode === 'owner'
  }

  /**
   * Check if user is an instructor
   */
  isInstructor(): boolean {
    return this.roleCode === 'instructor'
  }

  /**
   * Check if user is staff (owner or instructor)
   */
  isStaff(): boolean {
    return this.roleCode === 'owner' || this.roleCode === 'instructor'
  }

  /**
   * Check if user is a parent
   */
  isParent(): boolean {
    return this.roleCode === 'parent'
  }

  /**
   * Check if user is a student
   */
  isStudent(): boolean {
    return this.roleCode === 'student'
  }

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    return this.onboardingCompleted
  }

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(): boolean {
    return !this.onboardingCompleted && this.approvalStatus === 'approved'
  }

  /**
   * Check if user is approved
   */
  isApproved(): boolean {
    return this.approvalStatus === 'approved'
  }

  /**
   * Check if user is pending approval
   */
  isPending(): boolean {
    return this.approvalStatus === 'pending'
  }

  /**
   * Check if user is rejected
   */
  isRejected(): boolean {
    return this.approvalStatus === 'rejected'
  }

  /**
   * Check if user has tenant
   */
  hasTenant(): boolean {
    return this.tenantId !== null
  }

  /**
   * Check if user is deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null
  }

  /**
   * Check if user is active
   */
  isActive(): boolean {
    return !this.isDeleted() && this.isApproved()
  }

  /**
   * Check if user can manage tenant
   */
  canManageTenant(): boolean {
    return this.isOwner() && this.isApproved()
  }

  /**
   * Check if user can manage students
   */
  canManageStudents(): boolean {
    return this.isStaff() && this.isApproved()
  }

  // ==================== State Changes ====================

  /**
   * Complete onboarding
   */
  completeOnboarding(): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      true,
      new Date(),
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      this.settings,
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Approve user
   */
  approve(approvedBy: string): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      'approved',
      null,
      new Date(),
      approvedBy,
      this.settings,
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Reject user
   */
  reject(reason: string, rejectedBy: string): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      'rejected',
      reason,
      new Date(),
      rejectedBy,
      this.settings,
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Update profile
   */
  updateProfile(data: {
    name?: string
    phone?: string
    address?: string
  }): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      data.name ?? this.name,
      data.phone !== undefined ? data.phone : this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      this.settings,
      this.preferences,
      data.address !== undefined ? data.address : this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Update settings
   */
  updateSettings(settings: Record<string, unknown>): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      { ...this.settings, ...settings },
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Update preferences
   */
  updatePreferences(preferences: Record<string, unknown>): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      this.settings,
      { ...this.preferences, ...preferences },
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Assign to tenant
   */
  assignToTenant(tenantId: string, roleCode: UserRole): User {
    return new User(
      this.id,
      tenantId,
      this.email,
      this.name,
      this.phone,
      roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      this.settings,
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      this.deletedAt
    )
  }

  /**
   * Soft delete user
   */
  delete(): User {
    return new User(
      this.id,
      this.tenantId,
      this.email,
      this.name,
      this.phone,
      this.roleCode,
      this.onboardingCompleted,
      this.onboardingCompletedAt,
      this.approvalStatus,
      this.approvalReason,
      this.approvedAt,
      this.approvedBy,
      this.settings,
      this.preferences,
      this.address,
      this.createdAt,
      new Date(),
      new Date()
    )
  }

  // ==================== DTO Conversion ====================

  /**
   * Convert to DTO for API responses
   */
  toDTO(): UserDTO {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email.getValue(),
      name: this.name,
      phone: this.phone,
      roleCode: this.roleCode,
      onboardingCompleted: this.onboardingCompleted,
      onboardingCompletedAt: this.onboardingCompletedAt?.toISOString() ?? null,
      approvalStatus: this.approvalStatus,
      approvalReason: this.approvalReason,
      approvedAt: this.approvedAt?.toISOString() ?? null,
      approvedBy: this.approvedBy,
      settings: this.settings,
      preferences: this.preferences,
      address: this.address,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() ?? null,
    }
  }
}
