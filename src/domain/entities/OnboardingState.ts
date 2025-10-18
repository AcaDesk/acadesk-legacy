/**
 * OnboardingState Entity
 * 온보딩 상태 도메인 엔티티
 */

import type { UserRole, ApprovalStatus } from './User'

export interface OnboardingStateDTO {
  authUserId: string
  emailConfirmed: boolean
  appUserExists: boolean
  tenantId: string | null
  roleCode: UserRole | null
  onboardingCompleted: boolean
  approvalStatus: ApprovalStatus
}

export interface CreateOnboardingStateProps {
  authUserId: string
  emailConfirmed: boolean
  appUserExists: boolean
  tenantId?: string | null
  roleCode?: UserRole | null
  onboardingCompleted?: boolean
  approvalStatus?: ApprovalStatus
}

/**
 * OnboardingState Domain Entity
 * 사용자의 온보딩 진행 상태를 관리
 */
export class OnboardingState {
  private constructor(
    private readonly authUserId: string,
    private readonly emailConfirmed: boolean,
    private readonly appUserExists: boolean,
    private readonly tenantId: string | null,
    private readonly roleCode: UserRole | null,
    private readonly onboardingCompleted: boolean,
    private readonly approvalStatus: ApprovalStatus
  ) {}

  /**
   * Create OnboardingState
   */
  static create(props: CreateOnboardingStateProps): OnboardingState {
    return new OnboardingState(
      props.authUserId,
      props.emailConfirmed,
      props.appUserExists,
      props.tenantId ?? null,
      props.roleCode ?? null,
      props.onboardingCompleted ?? false,
      props.approvalStatus ?? 'pending'
    )
  }

  /**
   * Create from RPC response
   */
  static fromRPCResponse(data: {
    auth_user_id: string
    email_confirmed: boolean
    app_user_exists: boolean
    tenant_id: string | null
    role_code: UserRole | null
    onboarding_completed: boolean
    approval_status: ApprovalStatus
  }): OnboardingState {
    return new OnboardingState(
      data.auth_user_id,
      data.email_confirmed,
      data.app_user_exists,
      data.tenant_id,
      data.role_code,
      data.onboarding_completed,
      data.approval_status
    )
  }

  // ==================== Getters ====================

  getAuthUserId(): string {
    return this.authUserId
  }

  isEmailConfirmed(): boolean {
    return this.emailConfirmed
  }

  hasAppUser(): boolean {
    return this.appUserExists
  }

  getTenantId(): string | null {
    return this.tenantId
  }

  getRoleCode(): UserRole | null {
    return this.roleCode
  }

  isOnboardingCompleted(): boolean {
    return this.onboardingCompleted
  }

  getApprovalStatus(): ApprovalStatus {
    return this.approvalStatus
  }

  // ==================== Business Logic ====================

  /**
   * Check if user needs email confirmation
   */
  needsEmailConfirmation(): boolean {
    return !this.emailConfirmed
  }

  /**
   * Check if user needs to create app profile
   */
  needsProfileCreation(): boolean {
    return this.emailConfirmed && !this.appUserExists
  }

  /**
   * Check if user needs approval
   */
  needsApproval(): boolean {
    return this.appUserExists && this.approvalStatus === 'pending'
  }

  /**
   * Check if user is approved
   */
  isApproved(): boolean {
    return this.approvalStatus === 'approved'
  }

  /**
   * Check if user is rejected
   */
  isRejected(): boolean {
    return this.approvalStatus === 'rejected'
  }

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(): boolean {
    return this.appUserExists && this.isApproved() && !this.onboardingCompleted
  }

  /**
   * Check if user has completed all steps
   */
  hasCompletedAllSteps(): boolean {
    return (
      this.emailConfirmed &&
      this.appUserExists &&
      this.isApproved() &&
      this.onboardingCompleted
    )
  }

  /**
   * Check if user is an owner
   */
  isOwner(): boolean {
    return this.roleCode === 'owner'
  }

  /**
   * Check if user is staff (needs invitation)
   */
  isStaff(): boolean {
    return (
      this.roleCode === 'instructor' ||
      this.roleCode === 'assistant'
    )
  }

  /**
   * Check if user has tenant
   */
  hasTenant(): boolean {
    return this.tenantId !== null
  }

  /**
   * Get next step in onboarding flow
   */
  getNextStep(): OnboardingStep {
    if (!this.emailConfirmed) {
      return 'email-confirmation'
    }

    if (!this.appUserExists) {
      return 'profile-creation'
    }

    if (this.approvalStatus === 'pending') {
      return 'awaiting-approval'
    }

    if (this.approvalStatus === 'rejected') {
      return 'rejected'
    }

    if (!this.onboardingCompleted) {
      if (this.isOwner()) {
        return 'owner-onboarding'
      } else {
        return 'staff-onboarding'
      }
    }

    return 'completed'
  }

  /**
   * Get onboarding progress percentage
   */
  getProgressPercentage(): number {
    const steps = [
      this.emailConfirmed,
      this.appUserExists,
      this.approvalStatus === 'approved',
      this.onboardingCompleted,
    ]

    const completedSteps = steps.filter(Boolean).length
    return Math.round((completedSteps / steps.length) * 100)
  }

  // ==================== DTO Conversion ====================

  /**
   * Convert to DTO
   */
  toDTO(): OnboardingStateDTO {
    return {
      authUserId: this.authUserId,
      emailConfirmed: this.emailConfirmed,
      appUserExists: this.appUserExists,
      tenantId: this.tenantId,
      roleCode: this.roleCode,
      onboardingCompleted: this.onboardingCompleted,
      approvalStatus: this.approvalStatus,
    }
  }
}

/**
 * Onboarding step type
 */
export type OnboardingStep =
  | 'email-confirmation'
  | 'profile-creation'
  | 'awaiting-approval'
  | 'rejected'
  | 'owner-onboarding'
  | 'staff-onboarding'
  | 'completed'
