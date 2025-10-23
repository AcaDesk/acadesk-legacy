/**
 * 단일 라우팅 규칙 (Single Routing Rule)
 *
 * ✅ 완전히 server-side + service_role 기반으로 변경
 *
 * 로그인 후 항상 checkOnboardingStage() Server Action을 호출하여
 * 현재 상태에 맞는 페이지로 이동
 * - 로그인 성공 직후
 * - 이메일 인증 완료 후
 * - 보호 라우트 진입 전
 * - 앱 최초 로드 시
 */

'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { checkOnboardingStage } from '@/app/actions/onboarding'

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
 *
 * ✅ Server Action 사용 (RPC 호출 제거)
 *
 * @param router - Next.js App Router 인스턴스
 * @param inviteToken - 초대 토큰 (선택)
 */
export async function routeAfterLogin(
  router: AppRouterInstance,
  inviteToken?: string
): Promise<void> {
  try {
    // ✅ Server Action 호출 (service_role 기반)
    const result = await checkOnboardingStage(inviteToken)

    if (!result.success || !result.data) {
      console.error('[routeAfterLogin] checkOnboardingStage failed:', result.error)
      router.push('/auth/login')
      return
    }

    const response = result.data as AuthStageResponse

    if (!response?.ok) {
      console.error('[routeAfterLogin] checkOnboardingStage returned not ok:', response)
      router.push('/auth/login')
      return
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
    // 에러 발생 시 로그인으로 돌아감
    router.push('/auth/login')
  }
}

/**
 * 서버 컴포넌트용: 현재 인증 단계 조회만 (라우팅 없음)
 *
 * ✅ Server Action 사용 (RPC 호출 제거)
 *
 * @param inviteToken - 초대 토큰 (선택)
 * @returns {AuthStageResponse | null} 인증 단계 정보 또는 null
 */
export async function getAuthStage(inviteToken?: string): Promise<AuthStageResponse | null> {
  try {
    // ✅ Server Action 호출 (service_role 기반)
    const result = await checkOnboardingStage(inviteToken)

    if (!result.success || !result.data) {
      console.error('[getAuthStage] checkOnboardingStage failed:', result.error)
      return null
    }

    return result.data as AuthStageResponse
  } catch (err) {
    console.error('[getAuthStage] error:', err)
    return null
  }
}
