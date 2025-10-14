/**
 * Onboarding Service
 * Data Access Layer for user onboarding logic
 */

import { createClient } from "@/lib/supabase/client"
import type { OnboardingFormData, Invitation } from "@/types/auth.types"

export const onboardingService = {
  /**
   * Get current user info for onboarding
   */
  async getCurrentUser() {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    return { user, error }
  },

  /**
   * Check if user has completed onboarding
   */
  async checkOnboardingStatus(userId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("users")
      .select("onboarding_completed, role_code")
      .eq("id", userId)
      .single()

    return { data, error }
  },

  /**
   * Validate invitation code
   */
  async validateInvitationCode(code: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", code)
      .eq("status", "pending")
      .single()

    if (error || !data) {
      return { invitation: null, error: error || new Error("Invalid invitation code") }
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      return { invitation: null, error: new Error("Invitation expired") }
    }

    const invitation: Invitation = {
      id: data.id,
      tenantId: data.tenant_id,
      invitedBy: data.invited_by,
      email: data.email,
      roleCode: data.role_code,
      token: data.token,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    }

    return { invitation, error: null }
  },

  /**
   * Complete onboarding for owner role
   */
  async completeOwnerOnboarding(userId: string, data: OnboardingFormData) {
    const supabase = createClient()

    const { error } = await supabase
      .from("users")
      .update({
        name: data.name,
        role_code: "owner",
        onboarding_completed: true,
      })
      .eq("id", userId)

    return { error }
  },

  /**
   * Complete onboarding for staff role with invitation
   */
  async completeStaffOnboarding(
    userId: string,
    data: OnboardingFormData,
    invitation: Invitation
  ) {
    const supabase = createClient()

    // Update user profile
    const { error: userError } = await supabase
      .from("users")
      .update({
        name: data.name,
        role_code: invitation.roleCode,
        tenant_id: invitation.tenantId,
        onboarding_completed: true,
      })
      .eq("id", userId)

    if (userError) {
      return { error: userError }
    }

    // Update invitation status
    const { error: invitationError } = await supabase
      .from("staff_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)

    return { error: invitationError }
  },
}
