/**
 * SupabaseOnboardingRepository
 * Supabase implementation of IOnboardingRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IOnboardingRepository,
  CompleteOwnerOnboardingData,
  CompleteAcademySetupData,
  OnboardingResult,
} from '@/domain/repositories/IOnboardingRepository'
import { OnboardingState } from '@/domain/entities/OnboardingState'
import type { UserRole, ApprovalStatus } from '@/domain/entities/User'

interface OnboardingStateRPCResponse {
  auth_user_id: string
  email_confirmed: boolean
  app_user_exists: boolean
  tenant_id: string | null
  role_code: UserRole | null
  onboarding_completed: boolean
  approval_status: ApprovalStatus
}

export class SupabaseOnboardingRepository implements IOnboardingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Get onboarding state for current user
   */
  async getOnboardingState(): Promise<OnboardingState | null> {
    const { data, error } = await this.supabase.rpc('get_onboarding_state')

    if (error || !data) {
      console.error('Failed to get onboarding state:', error)
      return null
    }

    return OnboardingState.fromRPCResponse(data as OnboardingStateRPCResponse)
  }

  /**
   * Complete owner onboarding
   * Creates tenant and assigns owner role
   */
  async completeOwnerOnboarding(data: CompleteOwnerOnboardingData): Promise<OnboardingResult> {
    const { data: result, error } = await this.supabase.rpc('complete_owner_onboarding', {
      _user_id: data.userId,
      _name: data.name,
      _academy_name: data.academyName,
      _slug: data.slug ?? null,
    })

    if (error) {
      console.error('complete_owner_onboarding RPC error:', error)
      return {
        success: false,
        error: '온보딩 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.',
      }
    }

    const rpcResult = result as { success: boolean; error?: string; user?: unknown; tenant?: unknown }

    if (!rpcResult?.success) {
      return {
        success: false,
        error: rpcResult?.error || '온보딩 완료에 실패했습니다.',
      }
    }

    return {
      success: true,
      data: {
        user: rpcResult.user,
        tenant: rpcResult.tenant,
      },
    }
  }

  /**
   * Complete academy setup (final step for owner)
   */
  async completeAcademySetup(data: CompleteAcademySetupData): Promise<OnboardingResult> {
    const { data: result, error } = await this.supabase.rpc('finish_owner_academy_setup', {
      _academy_name: data.academyName,
      _timezone: data.timezone ?? 'Asia/Seoul',
      _settings: data.settings ?? {},
    })

    if (error) {
      console.error('finish_owner_academy_setup RPC error:', error)
      return {
        success: false,
        error: '학원 설정 중 오류가 발생했습니다.',
      }
    }

    const rpcResult = result as { success: boolean; error?: string }

    if (!rpcResult?.success) {
      return {
        success: false,
        error: rpcResult?.error || '학원 설정에 실패했습니다.',
      }
    }

    return { success: true }
  }

  /**
   * Check approval status
   */
  async checkApprovalStatus(): Promise<{
    success: boolean
    status?: string
    reason?: string
    tenantId?: string
    error?: string
  }> {
    const { data, error } = await this.supabase.rpc('check_approval_status')

    if (error || !data) {
      return {
        success: false,
        error: '승인 상태 확인에 실패했습니다.',
      }
    }

    const result = data as {
      success: boolean
      status?: string
      reason?: string
      tenant_id?: string
      error?: string
    }

    return {
      success: result.success,
      status: result.status,
      reason: result.reason,
      tenantId: result.tenant_id,
      error: result.error,
    }
  }
}
