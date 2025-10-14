/**
 * Invitation Service
 * 직원 초대 시스템 관리
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/client"
import { randomBytes } from "crypto"

export interface InvitationData {
  email: string
  roleCode: "instructor" | "assistant"
  message?: string
}

export interface Invitation {
  id: string
  tenantId: string
  invitedBy: string
  email: string
  roleCode: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
}

export class InvitationService {
  /**
   * 초대 토큰 생성
   */
  private static generateToken(): string {
    return randomBytes(32).toString("hex")
  }

  /**
   * 직원 초대 (클라이언트용)
   */
  static async inviteStaff(
    data: InvitationData
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      const supabase = createClient()

      // 현재 사용자 정보 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: "로그인이 필요합니다." }
      }

      // 사용자의 tenant_id 가져오기
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id, role_code")
        .eq("id", user.id)
        .single()

      if (userError || !userData?.tenant_id) {
        return { success: false, error: "권한이 없습니다." }
      }

      // 원장(admin)만 초대 가능
      if (userData.role_code !== "admin") {
        return { success: false, error: "원장만 직원을 초대할 수 있습니다." }
      }

      // 초대 생성
      const token = this.generateToken()
      const { data: invitation, error: invitationError } = await supabase
        .from("staff_invitations")
        .insert({
          tenant_id: userData.tenant_id,
          invited_by: user.id,
          email: data.email,
          role_code: data.roleCode,
          token,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
        })
        .select()
        .single()

      if (invitationError || !invitation) {
        return { success: false, error: "초대 생성에 실패했습니다." }
      }

      // TODO: 초대 이메일 전송
      // await sendInvitationEmail(data.email, token)

      return { success: true, invitationId: invitation.id }
    } catch (error) {
      console.error("Invite staff error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 직원 초대 (서버용)
   */
  static async inviteStaffServer(
    userId: string,
    data: InvitationData
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      const supabase = await createServerClient()

      // 사용자의 tenant_id 가져오기
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id, role_code")
        .eq("id", userId)
        .single()

      if (userError || !userData?.tenant_id) {
        return { success: false, error: "권한이 없습니다." }
      }

      // 원장(admin)만 초대 가능
      if (userData.role_code !== "admin") {
        return { success: false, error: "원장만 직원을 초대할 수 있습니다." }
      }

      // 초대 생성
      const token = this.generateToken()
      const { data: invitation, error: invitationError } = await supabase
        .from("staff_invitations")
        .insert({
          tenant_id: userData.tenant_id,
          invited_by: userId,
          email: data.email,
          role_code: data.roleCode,
          token,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (invitationError || !invitation) {
        return { success: false, error: "초대 생성에 실패했습니다." }
      }

      return { success: true, invitationId: invitation.id }
    } catch (error) {
      console.error("Invite staff error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 초대 토큰으로 초대 정보 조회
   */
  static async getInvitationByToken(
    token: string
  ): Promise<{ invitation?: Invitation; error?: string }> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("staff_invitations")
        .select(
          `
          id,
          tenant_id,
          invited_by,
          email,
          role_code,
          token,
          status,
          expires_at,
          created_at
        `
        )
        .eq("token", token)
        .single()

      if (error || !data) {
        return { error: "유효하지 않은 초대입니다." }
      }

      // 만료 확인
      if (new Date(data.expires_at) < new Date()) {
        return { error: "초대가 만료되었습니다." }
      }

      // 상태 확인
      if (data.status !== "pending") {
        return { error: "이미 사용된 초대입니다." }
      }

      return {
        invitation: {
          id: data.id,
          tenantId: data.tenant_id,
          invitedBy: data.invited_by,
          email: data.email,
          roleCode: data.role_code,
          token: data.token,
          status: data.status,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
        },
      }
    } catch (error) {
      console.error("Get invitation error:", error)
      return { error: "초대 정보를 가져올 수 없습니다." }
    }
  }

  /**
   * 초대 수락
   */
  static async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      // 초대 정보 확인
      const { invitation, error: invitationError } =
        await this.getInvitationByToken(token)

      if (invitationError || !invitation) {
        return { success: false, error: invitationError }
      }

      // 초대 상태 업데이트
      const { error: updateError } = await supabase
        .from("staff_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq("token", token)

      if (updateError) {
        return { success: false, error: "초대 수락에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Accept invitation error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 초대 취소
   */
  static async cancelInvitation(
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId)

      if (error) {
        return { success: false, error: "초대 취소에 실패했습니다." }
      }

      return { success: true }
    } catch (error) {
      console.error("Cancel invitation error:", error)
      return { success: false, error: "알 수 없는 오류가 발생했습니다." }
    }
  }

  /**
   * 학원의 모든 초대 목록 조회
   */
  static async getInvitations(): Promise<{
    invitations?: Invitation[]
    error?: string
  }> {
    try {
      const supabase = createClient()

      // 현재 사용자 정보 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return { error: "로그인이 필요합니다." }
      }

      // 사용자의 tenant_id 가져오기
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (userError || !userData?.tenant_id) {
        return { error: "권한이 없습니다." }
      }

      // 초대 목록 조회
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*")
        .eq("tenant_id", userData.tenant_id)
        .order("created_at", { ascending: false })

      if (error) {
        return { error: "초대 목록을 가져올 수 없습니다." }
      }

      return {
        invitations: data.map((inv) => ({
          id: inv.id,
          tenantId: inv.tenant_id,
          invitedBy: inv.invited_by,
          email: inv.email,
          roleCode: inv.role_code,
          token: inv.token,
          status: inv.status,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
        })),
      }
    } catch (error) {
      console.error("Get invitations error:", error)
      return { error: "초대 목록을 가져올 수 없습니다." }
    }
  }
}
