/**
 * Onboarding Service
 * Data Access Layer for user onboarding logic
 */

import { createClient } from "@/lib/supabase/client"
import type {
  OnboardingFormData,
  Invitation,
  OnboardingStateResponse,
  InvitationValidationResponse,
} from "@/types/auth.types"

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
   * Uses RPC function to bypass RLS restrictions
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkOnboardingStatus(_userId: string) {
    const supabase = createClient()

    // Use RPC function instead of direct SELECT to bypass RLS
    const { data, error } = await supabase
      .rpc("get_onboarding_state")
      .single()

    if (error || !data) {
      return { data: null, error }
    }

    const state = data as OnboardingStateResponse

    // Transform RPC response to expected format
    return {
      data: {
        onboarding_completed: state.onboarding_completed,
        role_code: state.role_code,
      },
      error: null,
    }
  },

  /**
   * Validate invitation code
   * Uses RPC function for secure validation
   */
  async validateInvitationCode(code: string) {
    const supabase = createClient()

    // Use RPC function for validation (bypasses RLS)
    const { data, error } = await supabase
      .rpc("validate_invitation_token", { _token: code })
      .single()

    if (error || !data) {
      return { invitation: null, error: error || new Error("Failed to validate invitation") }
    }

    const validation = data as InvitationValidationResponse

    // Check if valid
    if (!validation.valid) {
      const reason = validation.reason || "unknown"
      let errorMessage = "Invalid invitation code"

      if (reason === "not_found") {
        errorMessage = "Invitation not found"
      } else if (reason === "expired") {
        errorMessage = "Invitation expired"
      } else if (reason.startsWith("status_")) {
        errorMessage = "Invitation already used"
      }

      return { invitation: null, error: new Error(errorMessage) }
    }

    // Build invitation object from RPC response
    const invitation: Invitation = {
      id: "", // RPC doesn't return ID - we'll fetch it separately if needed
      tenantId: validation.tenant_id!,
      invitedBy: "", // Not returned by RPC
      email: validation.email!,
      roleCode: validation.role_code!,
      token: code,
      status: "pending",
      expiresAt: validation.expires_at!,
      createdAt: "", // Not returned by RPC
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
