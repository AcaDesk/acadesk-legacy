/**
 * Authentication related types
 */

export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  agreedToTerms: boolean
}

export interface LoginFormData {
  email: string
  password: string
}

export interface OnboardingFormData {
  name: string
  role: "owner" | "staff"
  invitationCode?: string
}

export interface Invitation {
  id: string
  tenantId: string
  invitedBy: string
  email: string
  roleCode: string
  token: string
  status: "pending" | "accepted" | "rejected" | "expired"
  expiresAt: string
  createdAt: string
}

export type OAuthProvider = "google" | "kakao"

export interface AuthUser {
  id: string
  email: string
  name?: string
  roleCode?: string
  tenantId?: string
  onboardingCompleted?: boolean
  approvalStatus?: "pending" | "approved" | "rejected"
}

// ============================================================================
// RPC Response Types (from 06_RPC.sql)
// ============================================================================

/**
 * Response from get_onboarding_state() RPC function
 */
export interface OnboardingStateResponse {
  auth_user_id: string
  email_confirmed: boolean
  app_user_exists: boolean
  tenant_id: string | null
  role_code: string | null
  onboarding_completed: boolean
  approval_status: "pending" | "approved" | "rejected"
}

/**
 * Response from validate_invitation_token() RPC function
 */
export interface InvitationValidationResponse {
  valid: boolean
  reason?: string // Only present when valid = false
  tenant_id?: string // Only present when valid = true
  email?: string // Only present when valid = true
  role_code?: string // Only present when valid = true
  expires_at?: string // Only present when valid = true
}
