/**
 * 단일 라우팅 규칙 (Single Routing Rule)
 *
 * 로그인 후 항상 get_auth_stage()를 호출하여 현재 상태에 맞는 페이지로 이동
 * - 로그인 성공 직후
 * - 이메일 인증 완료 후
 * - 보호 라우트 진입 전
 * - 앱 최초 로드 시
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { AuthStageError, parseRpcError } from './auth-errors'

interface AuthStageResponse {
  ok: boolean
  stage?: {
    code: 'NO_PROFILE' | 'PENDING_OWNER_REVIEW' | 'OWNER_SETUP_REQUIRED' | 'MEMBER_INVITED' | 'READY'
    next_url?: string
  }
  error?: string
}

/**
 * 로그인 후 자동 라우팅
 * @param router - Next.js App Router 인스턴스
 * @param inviteToken - 초대 토큰 (선택)
 * @throws {AuthStageError} 인증 상태 확인 실패 시
 */
export async function routeAfterLogin(
  router: AppRouterInstance,
  inviteToken?: string
): Promise<void> {
  const supabase = createClient()

  try {
    // inviteToken을 파라미터로 전달
    const { data, error } = await supabase.rpc('get_auth_stage', {
      p_invite_token: inviteToken || null,
    })

    if (error) {
      console.error('[routeAfterLogin] get_auth_stage RPC error:', error)
      throw parseRpcError(error, 'auth_stage')
    }

    const response = data as AuthStageResponse

    if (!response?.ok) {
      console.error('[routeAfterLogin] get_auth_stage returned not ok:', response)
      throw parseRpcError(
        new Error(response?.error || '인증 상태를 확인할 수 없습니다.'),
        'auth_stage'
      )
    }

    const { code, next_url } = response.stage || {}

    console.log(`[routeAfterLogin] Auth stage: ${code}, next_url: ${next_url || '/dashboard'}`)

    // 상태별 라우팅
    if (next_url) {
      router.push(next_url)
    } else if (code === 'READY') {
      router.push('/dashboard')
    } else {
      // 예상치 못한 상태
      console.warn(`[routeAfterLogin] Unexpected stage code: ${code}`)
      router.push('/auth/login')
    }
  } catch (err) {
    console.error('[routeAfterLogin] error:', err)
    // AuthStageError인 경우 더 구체적인 로깅
    if (err instanceof AuthStageError) {
      console.error('[routeAfterLogin] AuthStageError:', {
        code: err.code,
        message: err.message,
        originalError: err.originalError,
      })
    }
    // 에러 발생 시 로그인으로 돌아감
    router.push('/auth/login')
  }
}

/**
 * 서버 컴포넌트용: 현재 인증 단계 조회만 (라우팅 없음)
 * @param inviteToken - 초대 토큰 (선택)
 * @returns {AuthStageResponse | null} 인증 단계 정보 또는 null
 */
export async function getAuthStage(inviteToken?: string): Promise<AuthStageResponse | null> {
  const supabase = createClient()

  try {
    // inviteToken을 파라미터로 전달
    const { data, error } = await supabase.rpc('get_auth_stage', {
      p_invite_token: inviteToken || null,
    })

    if (error) {
      console.error('[getAuthStage] RPC error:', error)
      return null
    }

    return data as AuthStageResponse
  } catch (err) {
    console.error('[getAuthStage] error:', err)
    if (err instanceof AuthStageError) {
      console.error('[getAuthStage] AuthStageError:', {
        code: err.code,
        message: err.message,
      })
    }
    return null
  }
}
