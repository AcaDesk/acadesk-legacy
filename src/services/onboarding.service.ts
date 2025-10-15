/**
 * Onboarding Service
 * 학원 설정 및 온보딩 프로세스 관리
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/client"
import type { OnboardingStateResponse } from "@/types/auth.types"

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

export class OnboardingService {
  /**
   * 학원 설정 완료 (클라이언트용)
   */
  static async completeAcademySetup(
    userId: string,
    data: AcademySetupData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      // 1. RPC로 사용자 상태 조회 (RLS 우회)
      const { data: state, error: stateError } = await supabase
        .rpc("get_onboarding_state")
        .single()

      if (stateError || !state) {
        return { success: false, error: "사용자 정보를 찾을 수 없습니다." }
      }

      const onboardingState = state as OnboardingStateResponse

      if (!onboardingState.tenant_id) {
        return { success: false, error: "테넌트 정보를 찾을 수 없습니다." }
      }

      const tenantId = onboardingState.tenant_id

      // 2. tenant 정보 업데이트
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          name: data.academyName,
          timezone: data.timezone || "Asia/Seoul",
          settings: {
            address: data.academyAddress,
            phone: data.academyPhone,
            businessHours: data.businessHours,
            subjects: data.subjects,
          },
        })
        .eq("id", tenantId)

      if (tenantError) {
        return { success: false, error: "학원 정보 업데이트에 실패했습니다." }
      }

      // 3. 사용자의 온보딩 완료 처리
      const { error: updateError } = await supabase
        .from("users")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateError) {
        return { success: false, error: "온보딩 완료 처리에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Academy setup error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 학원 설정 완료 (서버용 - Server Component/API Route)
   */
  static async completeAcademySetupServer(
    userId: string,
    data: AcademySetupData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createServerClient()

      // 1. RPC로 사용자 상태 조회 (RLS 우회)
      const { data: state, error: stateError } = await supabase
        .rpc("get_onboarding_state")
        .single()

      if (stateError || !state) {
        return { success: false, error: "사용자 정보를 찾을 수 없습니다." }
      }

      const onboardingState = state as OnboardingStateResponse

      if (!onboardingState.tenant_id) {
        return { success: false, error: "테넌트 정보를 찾을 수 없습니다." }
      }

      const tenantId = onboardingState.tenant_id

      // 2. tenant 정보 업데이트
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          name: data.academyName,
          timezone: data.timezone || "Asia/Seoul",
          settings: {
            address: data.academyAddress,
            phone: data.academyPhone,
            businessHours: data.businessHours,
            subjects: data.subjects,
          },
        })
        .eq("id", tenantId)

      if (tenantError) {
        return { success: false, error: "학원 정보 업데이트에 실패했습니다." }
      }

      // 3. 사용자의 온보딩 완료 처리
      const { error: updateError } = await supabase
        .from("users")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateError) {
        return { success: false, error: "온보딩 완료 처리에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Academy setup error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 온보딩 상태 확인
   * Uses RPC function to bypass RLS restrictions
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async checkOnboardingStatus(
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
      const { data, error } = await supabase
        .rpc("get_onboarding_state")
        .single()

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
  }
}
