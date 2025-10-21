/**
 * Auth Stage Service
 *
 * 새로운 인증 플로우의 핵심 RPC 함수들을 호출하는 서비스 레이어
 * - get_auth_stage: 현재 인증 단계 조회
 * - create_user_profile: NO_PROFILE 상태 해소
 * - owner_finish_setup: 원장 설정 완료
 * - accept_staff_invite: 직원 초대 수락
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { AuthStageError, parseRpcError } from '@/lib/auth/auth-errors'
import { errorReporter } from '@/lib/monitoring/error-reporter'

// ==================== Types ====================

interface AuthStageResponse {
  ok: boolean
  stage?: {
    code: 'NO_PROFILE' | 'PENDING_OWNER_REVIEW' | 'OWNER_SETUP_REQUIRED' | 'MEMBER_INVITED' | 'READY'
    next_url?: string
  }
  error?: string
}

interface RpcResponse {
  ok: boolean
  data?: Record<string, unknown>
  code?: string
  message?: string
}

interface AcademySetupParams {
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

// ==================== Client Service ====================

export const authStageService = {
  /**
   * 현재 인증 단계 조회
   */
  async getAuthStage(inviteToken?: string): Promise<{
    data: AuthStageResponse | null
    error: AuthStageError | null
  }> {
    const supabase = createClient()

    try {
      // inviteToken을 파라미터로 전달
      const { data, error } = await supabase.rpc('get_auth_stage', {
        p_invite_token: inviteToken || null,
      })

      if (error) {
        console.error('[authStageService] get_auth_stage RPC error:', error)
        const authError = parseRpcError(error, 'auth_stage')
        errorReporter.captureAuthStageError(authError, { method: 'getAuthStage', inviteToken: !!inviteToken })
        return { data: null, error: authError }
      }

      return { data: data as AuthStageResponse, error: null }
    } catch (err) {
      console.error('[authStageService] getAuthStage error:', err)
      const authError = parseRpcError(err, 'auth_stage')
      errorReporter.captureAuthStageError(authError, { method: 'getAuthStage', inviteToken: !!inviteToken })
      return { data: null, error: authError }
    }
  },

  /**
   * 프로필 생성 (NO_PROFILE → 다음 단계)
   * 멱등성 보장: 이미 존재하면 성공 반환
   */
  async createUserProfile(): Promise<{
    data: RpcResponse | null
    error: AuthStageError | null
  }> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('create_user_profile')

      if (error) {
        console.error('[authStageService] create_user_profile RPC error:', error)
        const authError = parseRpcError(error, 'profile')
        errorReporter.captureAuthStageError(authError, { method: 'createUserProfile' })
        return { data: null, error: authError }
      }

      const response = data as RpcResponse

      if (!response?.ok) {
        const authError = parseRpcError(
          new Error(response?.message || '프로필 생성에 실패했습니다.'),
          'profile'
        )
        errorReporter.captureAuthStageError(authError, { method: 'createUserProfile' })
        return { data: null, error: authError }
      }

      return { data: response, error: null }
    } catch (err) {
      console.error('[authStageService] createUserProfile error:', err)
      const authError = parseRpcError(err, 'profile')
      errorReporter.captureAuthStageError(authError, { method: 'createUserProfile' })
      return { data: null, error: authError }
    }
  },

  /**
   * 원장 설정 완료 (OWNER_SETUP_REQUIRED → READY)
   * 멱등성 보장: tenant가 없으면 생성, 있으면 업데이트
   * owner_setup_upsert 함수 사용 (tenant 생성 + 설정 업데이트를 한 번에 처리)
   */
  async ownerFinishSetup(params: AcademySetupParams): Promise<{
    data: RpcResponse | null
    error: AuthStageError | null
  }> {
    const supabase = createClient()

    try {
      // 1. 현재 사용자 정보 가져오기 (owner_name 용)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const authError = parseRpcError(new Error('인증되지 않은 사용자입니다.'), 'owner_setup')
        return { data: null, error: authError }
      }

      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single()

      const ownerName = userData?.name || userData?.email || '원장님'

      // 2. owner_setup_upsert 호출 (tenant 자동 생성 + 설정)
      const { data, error } = await supabase.rpc('owner_setup_upsert', {
        _owner_name: ownerName,
        _academy_name: params.academyName,
        _timezone: params.timezone ?? 'Asia/Seoul',
        _settings: params.settings ?? {},
      })

      if (error) {
        console.error('[authStageService] owner_setup_upsert RPC error:', error)
        const authError = parseRpcError(error, 'owner_setup')
        errorReporter.captureAuthStageError(authError, { method: 'ownerFinishSetup', academyName: params.academyName })
        return { data: null, error: authError }
      }

      const response = data as { success: boolean; error?: string }

      if (!response?.success) {
        const authError = parseRpcError(
          new Error(response?.error || '학원 설정에 실패했습니다.'),
          'owner_setup'
        )
        errorReporter.captureAuthStageError(authError, { method: 'ownerFinishSetup', academyName: params.academyName })
        return { data: null, error: authError }
      }

      // Response format 변환 (RpcResponse 형식으로)
      return { data: { ok: true }, error: null }
    } catch (err) {
      console.error('[authStageService] ownerFinishSetup error:', err)
      const authError = parseRpcError(err, 'owner_setup')
      errorReporter.captureAuthStageError(authError, { method: 'ownerFinishSetup', academyName: params.academyName })
      return { data: null, error: authError }
    }
  },

  /**
   * 직원 초대 수락 (MEMBER_INVITED → READY)
   * 멱등성 보장: 이미 수락된 토큰이면 에러 반환
   */
  async acceptStaffInvite(token: string): Promise<{
    data: RpcResponse | null
    error: AuthStageError | null
  }> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('accept_staff_invite', {
        p_token: token,
      })

      if (error) {
        console.error('[authStageService] accept_staff_invite RPC error:', error)
        const authError = parseRpcError(error, 'invite')
        errorReporter.captureAuthStageError(authError, { method: 'acceptStaffInvite', hasToken: true })
        return { data: null, error: authError }
      }

      const response = data as RpcResponse

      if (!response?.ok) {
        // RPC에서 반환한 에러 코드를 포함한 Error 객체 생성
        const rpcError = new Error(response?.message || '초대 수락에 실패했습니다.')
        Object.assign(rpcError, { code: response?.code })

        const authError = parseRpcError(rpcError, 'invite')
        errorReporter.captureAuthStageError(authError, { method: 'acceptStaffInvite', hasToken: true })
        return { data: null, error: authError }
      }

      return { data: response, error: null }
    } catch (err) {
      console.error('[authStageService] acceptStaffInvite error:', err)
      const authError = parseRpcError(err, 'invite')
      errorReporter.captureAuthStageError(authError, { method: 'acceptStaffInvite', hasToken: true })
      return { data: null, error: authError }
    }
  },

  /**
   * 원장 설정 마법사 초기화 (선택사항)
   * 테넌트 정보 등을 미리 로드할 때 사용
   */
  async ownerStartSetup(): Promise<{
    data: { tenant_id: string } | null
    error: AuthStageError | null
  }> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('owner_start_setup')

      if (error) {
        console.error('[authStageService] owner_start_setup RPC error:', error)
        const authError = parseRpcError(error, 'owner_setup')
        return { data: null, error: authError }
      }

      const response = data as RpcResponse

      if (!response?.ok) {
        const authError = parseRpcError(
          new Error(response?.message || '설정 초기화에 실패했습니다.'),
          'owner_setup'
        )
        return { data: null, error: authError }
      }

      return { data: response.data as { tenant_id: string } | null, error: null }
    } catch (err) {
      console.error('[authStageService] ownerStartSetup error:', err)
      const authError = parseRpcError(err, 'owner_setup')
      return { data: null, error: authError }
    }
  },
}

// ==================== Server Service (SSR/API Routes) ====================

export const authStageServerService = {
  /**
   * 서버 컴포넌트용: 현재 인증 단계 조회
   */
  async getAuthStage(inviteToken?: string): Promise<{
    data: AuthStageResponse | null
    error: AuthStageError | null
  }> {
    const supabase = await createServerClient()

    try {
      // inviteToken을 파라미터로 전달
      const { data, error } = await supabase.rpc('get_auth_stage', {
        p_invite_token: inviteToken || null,
      })

      if (error) {
        console.error('[authStageServerService] get_auth_stage RPC error:', error)
        const authError = parseRpcError(error, 'auth_stage')
        return { data: null, error: authError }
      }

      return { data: data as AuthStageResponse, error: null }
    } catch (err) {
      console.error('[authStageServerService] getAuthStage error:', err)
      const authError = parseRpcError(err, 'auth_stage')
      return { data: null, error: authError }
    }
  },

  /**
   * 서버 컴포넌트용: 원장 설정 완료
   */
  async ownerFinishSetup(params: AcademySetupParams): Promise<{
    data: RpcResponse | null
    error: AuthStageError | null
  }> {
    const supabase = await createServerClient()

    try {
      const { data, error } = await supabase.rpc('finish_owner_academy_setup', {
        _academy_name: params.academyName,
        _timezone: params.timezone ?? 'Asia/Seoul',
        _settings: params.settings ?? {},
      })

      if (error) {
        console.error('[authStageServerService] finish_owner_academy_setup RPC error:', error)
        const authError = parseRpcError(error, 'owner_setup')
        return { data: null, error: authError }
      }

      const response = data as RpcResponse

      if (!response?.ok) {
        const authError = parseRpcError(
          new Error(response?.message || '학원 설정에 실패했습니다.'),
          'owner_setup'
        )
        return { data: null, error: authError }
      }

      return { data: response, error: null }
    } catch (err) {
      console.error('[authStageServerService] ownerFinishSetup error:', err)
      const authError = parseRpcError(err, 'owner_setup')
      return { data: null, error: authError }
    }
  },
}
