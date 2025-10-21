/**
 * SupabaseOnboardingRepository
 * Supabase implementation of IOnboardingRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type {
  IOnboardingRepository,
  CompleteOwnerOnboardingData,
  CompleteAcademySetupData,
  OnboardingResult,
} from '@/domain/repositories/IOnboardingRepository'
import { OnboardingState } from '@/domain/entities/OnboardingState'
import type { UserRole, ApprovalStatus } from '@/domain/entities/User'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

interface OnboardingStateRPCResponse {
  auth_user_id: string
  email_confirmed: boolean
  app_user_exists: boolean
  tenant_id: string | null
  role_code: UserRole | null
  onboarding_completed: boolean
  approval_status: ApprovalStatus
}

export class OnboardingRepository implements IOnboardingRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * Get onboarding state for current user
   */
  async getOnboardingState(): Promise<OnboardingState | null> {
    const result = await this.dataSource.rpc('get_onboarding_state')
    const { data, error } = result as { data: any; error: Error | null }

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
    const rpcResult = await this.dataSource.rpc('complete_owner_onboarding', {
      _user_id: data.userId,
      _name: data.name,
      _academy_name: data.academyName,
      _slug: data.slug ?? null,
    })
    const { data: result, error } = rpcResult as { data: any; error: Error | null }

    if (error) {
      console.error('complete_owner_onboarding RPC error:', error)
      return {
        success: false,
        error: '온보딩 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.',
      }
    }

    const rpcResultData = result as { success: boolean; error?: string; user?: unknown; tenant?: unknown }

    if (!rpcResultData?.success) {
      return {
        success: false,
        error: rpcResultData?.error || '온보딩 완료에 실패했습니다.',
      }
    }

    return {
      success: true,
      data: {
        user: rpcResultData.user,
        tenant: rpcResultData.tenant,
      },
    }
  }

  /**
   * Complete academy setup (final step for owner)
   */
  async completeAcademySetup(data: CompleteAcademySetupData): Promise<OnboardingResult> {
    const rpcResult = await this.dataSource.rpc('finish_owner_academy_setup', {
      _academy_name: data.academyName,
      _timezone: data.timezone ?? 'Asia/Seoul',
      _settings: data.settings ?? {},
    })
    const { data: result, error } = rpcResult as { data: any; error: Error | null }

    if (error) {
      console.error('finish_owner_academy_setup RPC error:', error)
      return {
        success: false,
        error: '학원 설정 중 오류가 발생했습니다.',
      }
    }

    const rpcResultData = result as { success: boolean; error?: string }

    if (!rpcResultData?.success) {
      return {
        success: false,
        error: rpcResultData?.error || '학원 설정에 실패했습니다.',
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
    const result = await this.dataSource.rpc('check_approval_status')
    const { data, error } = result as { data: any; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: '승인 상태 확인에 실패했습니다.',
      }
    }

    const approvalStatus = data as {
      success: boolean
      status?: string
      reason?: string
      tenant_id?: string
      error?: string
    }

    return {
      success: approvalStatus.success,
      status: approvalStatus.status,
      reason: approvalStatus.reason,
      tenantId: approvalStatus.tenant_id,
      error: approvalStatus.error,
    }
  }
}
