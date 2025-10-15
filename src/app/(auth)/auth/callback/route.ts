import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { OnboardingStateResponse } from "@/types/auth.types"

/**
 * Supabase 인증 에러를 분석하여 적절한 에러 타입을 반환
 */
function classifyAuthError(error: { message?: string; code?: string }): string {
  const message = error.message?.toLowerCase() || ""
  const code = error.code?.toLowerCase() || ""

  // 만료된 링크
  if (message.includes("expired") || code.includes("expired")) {
    return "expired"
  }

  // 이미 사용된 링크
  if (
    message.includes("already") ||
    message.includes("used") ||
    code.includes("consumed")
  ) {
    return "used"
  }

  // 유효하지 않은 토큰
  if (
    message.includes("invalid") ||
    code.includes("invalid") ||
    message.includes("not found")
  ) {
    return "invalid"
  }

  // 기타 에러
  return "unknown"
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type") || "signup" // signup, recovery, invitation
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)

      // 에러 타입 분류
      const errorType = classifyAuthError(error)

      // 에러 타입에 따라 적절한 페이지로 리디렉션
      return NextResponse.redirect(
        `${origin}/auth/link-expired?type=${type}&error=${errorType}`
      )
    }

    // 세션 교환 성공 - 사용자 프로필 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/auth/login`)
    }

    // 이메일 확인 후 프로필 생성 (회원가입 시 이메일 확인이 필요한 경우)
    // 이미 프로필이 있으면 성공 메시지 반환
    const { data: profileResult } = await supabase.rpc('create_user_profile')

    if (profileResult && !profileResult.success) {
      console.error('Failed to create user profile:', profileResult.error)
    }

    // 승인 상태 확인
    const { data: approvalResult } = await supabase.rpc('check_approval_status')

    if (approvalResult?.status === 'pending') {
      // 승인 대기 중이면 대기 페이지로
      return NextResponse.redirect(`${origin}/auth/pending-approval`)
    } else if (approvalResult?.status === 'rejected') {
      // 거부되었으면 로그인 페이지로
      return NextResponse.redirect(`${origin}/auth/login?error=rejected`)
    }

    // RPC 함수로 온보딩 상태 확인 (RLS 우회)
    const { data: state, error: stateError } = await supabase
      .rpc("get_onboarding_state")
      .single() as { data: OnboardingStateResponse | null; error: unknown }

    if (stateError) {
      console.error("Failed to get onboarding state:", stateError)
      // 온보딩 상태를 가져올 수 없으면 온보딩 페이지로
      return NextResponse.redirect(`${origin}/onboarding?email=${encodeURIComponent(user.email || '')}&verified=true`)
    }

    // 온보딩이 완료되지 않았으면 온보딩 페이지로
    if (!state?.onboarding_completed) {
      return NextResponse.redirect(`${origin}/onboarding?email=${encodeURIComponent(user.email || '')}&verified=true`)
    }

    // 온보딩 완료된 사용자는 대시보드로
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // code가 없으면 로그인 페이지로
  return NextResponse.redirect(`${origin}/auth/login`)
}
