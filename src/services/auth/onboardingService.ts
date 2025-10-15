/**
 * Onboarding Service
 * Data Access Layer for user onboarding logic
 * Uses RPC functions for transaction-safe operations
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
    const { data, error } = await supabase.rpc("get_onboarding_state").single()

    if (error || !data) {
      return { data: null, error: error || new Error("온보딩 상태를 확인할 수 없습니다.") }
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
   * Uses improved RPC function that returns FULL invitation object
   */
  async validateInvitationCode(code: string) {
    const supabase = createClient()

    // Use RPC function for validation (bypasses RLS, returns full data)
    const { data, error } = await supabase
      .rpc("validate_invitation_token", { _token: code })
      .single()

    if (error || !data) {
      return {
        invitation: null,
        error: error || new Error("초대장 검증에 실패했습니다."),
      }
    }

    const validation = data as InvitationValidationResponse

    // Check if valid
    if (!validation.valid) {
      const reason = validation.reason || "unknown"
      let errorMessage = "유효하지 않은 초대 코드입니다."

      if (reason === "not_found") {
        errorMessage = "초대장을 찾을 수 없습니다."
      } else if (reason === "expired") {
        errorMessage = "초대장이 만료되었습니다."
      } else if (reason.startsWith("status_")) {
        errorMessage = "이미 사용된 초대장입니다."
      }

      return { invitation: null, error: new Error(errorMessage) }
    }

    // Build invitation object from RPC response (Single Source of Truth)
    // RPC now returns ALL fields, no manual assembly needed!
    const invitation: Invitation = {
      id: validation.id!,
      tenantId: validation.tenant_id!,
      invitedBy: validation.created_by!,
      email: validation.email!,
      roleCode: validation.role_code!,
      token: validation.token!,
      status: (validation.status as Invitation["status"]) || "pending",
      expiresAt: validation.expires_at!,
      createdAt: validation.created_at!,
    }

    return { invitation, error: null }
  },

  /**
   * Complete onboarding for owner role
   * Uses transactional RPC function
   */
  async completeOwnerOnboarding(userId: string, data: OnboardingFormData) {
    const supabase = createClient()

    const { data: result, error } = await supabase
      .rpc("complete_owner_onboarding", {
        _user_id: userId,
        _name: data.name,
        _academy_name: data.academyName!,
        _academy_code: null, // Auto-generated
      })
      .single()

    if (error) {
      return { error: new Error("온보딩 완료에 실패했습니다.") }
    }

    // Type-safe result check
    const rpcResult = result as { success: boolean; error?: string }

    if (!rpcResult.success) {
      return { error: new Error(rpcResult.error || "온보딩 완료에 실패했습니다.") }
    }

    return { error: null }
  },

  /**
   * Complete onboarding for staff role with invitation
   * Uses transactional RPC function (atomic operation)
   */
  async completeStaffOnboarding(
    userId: string,
    data: OnboardingFormData,
    invitation: Invitation
  ) {
    const supabase = createClient()

    // Call transactional RPC (updates users + invitation atomically)
    const { data: result, error } = await supabase
      .rpc("complete_staff_onboarding", {
        _user_id: userId,
        _name: data.name,
        _invitation_token: invitation.token,
      })
      .single()

    if (error) {
      return { error: new Error("온보딩 완료에 실패했습니다.") }
    }

    // Type-safe result check
    const rpcResult = result as { success: boolean; error?: string }

    if (!rpcResult.success) {
      return { error: new Error(rpcResult.error || "온보딩 완료에 실패했습니다.") }
    }

    return { error: null }
  },
}
