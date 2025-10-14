/**
 * Onboarding Service
 * 학원 설정 및 온보딩 프로세스 관리
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/client"

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

      // 1. tenant 정보 업데이트
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .single()

      if (userError || !userData?.tenant_id) {
        return { success: false, error: "사용자 정보를 찾을 수 없습니다." }
      }

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
        .eq("id", userData.tenant_id)

      if (tenantError) {
        return { success: false, error: "학원 정보 업데이트에 실패했습니다." }
      }

      // 2. 사용자의 온보딩 완료 처리
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

      // 1. tenant 정보 업데이트
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", userId)
        .single()

      if (userError || !userData?.tenant_id) {
        return { success: false, error: "사용자 정보를 찾을 수 없습니다." }
      }

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
        .eq("id", userData.tenant_id)

      if (tenantError) {
        return { success: false, error: "학원 정보 업데이트에 실패했습니다." }
      }

      // 2. 사용자의 온보딩 완료 처리
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
   */
  static async checkOnboardingStatus(
    userId: string
  ): Promise<{
    needsApproval: boolean
    needsOnboarding: boolean
    approvalStatus?: string
    onboardingCompleted?: boolean
  }> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("users")
        .select("approval_status, onboarding_completed")
        .eq("id", userId)
        .single()

      if (error || !data) {
        return { needsApproval: false, needsOnboarding: false }
      }

      return {
        needsApproval: data.approval_status === "pending",
        needsOnboarding:
          data.approval_status === "approved" && !data.onboarding_completed,
        approvalStatus: data.approval_status,
        onboardingCompleted: data.onboarding_completed,
      }
    } catch (error) {
      console.error("Check onboarding status error:", error)
      return { needsApproval: false, needsOnboarding: false }
    }
  }
}
