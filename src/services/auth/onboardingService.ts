/**
 * Onboarding Service
 * Data Access Layer for user onboarding logic
 * Uses RPC functions for transaction-safe operations
 */

import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type {
  OnboardingFormData,
  Invitation,
  OnboardingStateResponse,
  InvitationValidationResponse,
} from "@/types/auth.types"

// ==================== Academy Setup Types ====================

export interface AcademySetupData {
  academyName: string
  academyAddress?: string
  academyPhone?: string
  timezone?: string
  businessHours?: {
    start: string
    end: string
  }
  subjects?: string[]
  logo?: File
}

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
    const { data, error } = await supabase.rpc("get_onboarding_state")

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
   *
   * ⚠️ MVP: 현재 미지원 (invitation 테이블/RPC 없음)
   * 추후 구현 예정
   */
  async validateInvitationCode(_code: string) {
    return {
      invitation: null,
      error: new Error("초대 기능은 현재 준비 중입니다."),
    }
  },

  /*
  // TODO: MVP 이후 구현 예정
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
  */

  /**
   * Complete onboarding for owner role
   * Uses transactional RPC function
   */
  async completeOwnerOnboarding(userId: string, data: OnboardingFormData) {
    const supabase = createClient()

    // 디버깅: 환경 변수 확인 (개발 환경에서만)
    if (process.env.NODE_ENV !== "production") {
      console.log("🔍 Supabase Client Debug:", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
    }

    const { data: result, error } = await supabase.rpc("complete_owner_onboarding", {
      _user_id: userId,
      _name: data.name,
      _academy_name: data.academyName!,
      _slug: null, // Auto-generated
    })

    if (error) {
      console.error("complete_owner_onboarding RPC error:", error)
      return { error: new Error("온보딩 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.") }
    }

    // Type-safe result check
    const rpcResult = result as { success: boolean; error?: string }

    if (!rpcResult?.success) {
      return { error: new Error(rpcResult?.error || "온보딩 완료에 실패했습니다.") }
    }

    return { error: null }
  },

  /**
   * Complete onboarding for staff role with invitation
   *
   * ⚠️ MVP: 현재 미지원 (invitation 테이블/RPC 없음)
   * 추후 구현 예정
   */
  async completeStaffOnboarding(
    _userId: string,
    _data: OnboardingFormData,
    _invitation: Invitation
  ) {
    return { error: new Error("초대 기능은 현재 준비 중입니다.") }
  },

  /*
  // TODO: MVP 이후 구현 예정
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
  */

  // ==================== Academy Setup (Client) ====================

  /**
   * 학원 설정 완료 (클라이언트용)
   * Complete academy setup after owner onboarding
   * Uses transactional RPC function for atomic updates
   */
  async completeAcademySetup(
    _userId: string,
    data: AcademySetupData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      // Call RPC function (transactional: updates tenant + user atomically)
      const { data: result, error } = await supabase.rpc("finish_owner_academy_setup", {
        _academy_name: data.academyName,
        _timezone: data.timezone ?? "Asia/Seoul",
        _settings: {
          address: data.academyAddress,
          phone: data.academyPhone,
          businessHours: data.businessHours,
          subjects: data.subjects,
        },
      })

      if (error) {
        console.error("finish_owner_academy_setup RPC error:", error)
        return { success: false, error: "학원 설정 중 오류가 발생했습니다." }
      }

      // Type-safe result check
      const rpcResult = result as { success: boolean; error?: string }

      if (!rpcResult?.success) {
        return { success: false, error: rpcResult?.error || "학원 설정에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Academy setup error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  },

  /**
   * 학원 설정 완료 (서버용 - Server Component/API Route)
   * Uses transactional RPC function for atomic updates
   */
  async completeAcademySetupServer(
    _userId: string,
    data: AcademySetupData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createServerClient()

      // Call RPC function (transactional: updates tenant + user atomically)
      const { data: result, error } = await supabase.rpc("finish_owner_academy_setup", {
        _academy_name: data.academyName,
        _timezone: data.timezone ?? "Asia/Seoul",
        _settings: {
          address: data.academyAddress,
          phone: data.academyPhone,
          businessHours: data.businessHours,
          subjects: data.subjects,
        },
      })

      if (error) {
        console.error("finish_owner_academy_setup RPC error:", error)
        return { success: false, error: "학원 설정 중 오류가 발생했습니다." }
      }

      // Type-safe result check
      const rpcResult = result as { success: boolean; error?: string }

      if (!rpcResult?.success) {
        return { success: false, error: rpcResult?.error || "학원 설정에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Academy setup error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  },

  /**
   * 온보딩 상태 확인 (checkOnboardingStatus와 유사하지만 더 많은 정보 반환)
   */
  async checkOnboardingStatusDetailed(
    _userId: string
  ): Promise<{
    needsApproval: boolean
    needsOnboarding: boolean
    approvalStatus?: string
    onboardingCompleted?: boolean
  }> {
    try {
      const supabase = createClient()

      // Use RPC function instead of direct SELECT to bypass RLS
      const { data, error } = await supabase.rpc("get_onboarding_state")

      if (error || !data) {
        return { needsApproval: false, needsOnboarding: false }
      }

      const state = data as OnboardingStateResponse

      return {
        needsApproval: state.approval_status === "pending",
        needsOnboarding:
          state.approval_status === "approved" && !state.onboarding_completed,
        approvalStatus: state.approval_status,
        onboardingCompleted: state.onboarding_completed,
      }
    } catch (error) {
      console.error("Check onboarding status error:", error)
      return { needsApproval: false, needsOnboarding: false }
    }
  },
}
