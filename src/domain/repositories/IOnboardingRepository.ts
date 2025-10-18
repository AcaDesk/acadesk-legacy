/**
 * IOnboardingRepository
 * Onboarding repository interface
 */

import type { OnboardingState } from '@/domain/entities/OnboardingState'

export interface CompleteOwnerOnboardingData {
  userId: string
  name: string
  academyName: string
  slug?: string | null
}

export interface CompleteAcademySetupData {
  academyName: string
  timezone?: string
  settings?: {
    address?: string
    phone?: string
    businessHours?: {
      start: string
      end: string
    }
    subjects?: string[]
  }
}

export interface OnboardingResult {
  success: boolean
  error?: string
  data?: unknown
}

/**
 * Onboarding Repository Interface
 */
export interface IOnboardingRepository {
  /**
   * Get onboarding state for current user
   */
  getOnboardingState(): Promise<OnboardingState | null>

  /**
   * Complete owner onboarding
   * Creates tenant and assigns owner role
   */
  completeOwnerOnboarding(data: CompleteOwnerOnboardingData): Promise<OnboardingResult>

  /**
   * Complete academy setup (final step for owner)
   */
  completeAcademySetup(data: CompleteAcademySetupData): Promise<OnboardingResult>

  /**
   * Check approval status
   */
  checkApprovalStatus(): Promise<{
    success: boolean
    status?: string
    reason?: string
    tenantId?: string
    error?: string
  }>
}
