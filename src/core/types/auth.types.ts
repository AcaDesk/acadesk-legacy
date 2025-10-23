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
