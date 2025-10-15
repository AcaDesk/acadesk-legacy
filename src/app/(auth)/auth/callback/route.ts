import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Supabase 인증 에러를 분석하여 적절한 에러 타입을 반환
 */
function classifyAuthError(error: { message?: string; code?: string }): string {
  const m = error.message?.toLowerCase() || ""
  const c = error.code?.toLowerCase() || ""

  if (m.includes("expired") || c.includes("expired")) return "expired"
  if (m.includes("already") || m.includes("used") || c.includes("consumed")) return "used"
  if (m.includes("invalid") || c.includes("invalid") || m.includes("not found")) return "invalid"

  return "unknown"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const type = (url.searchParams.get("type") || "signup").toLowerCase() // signup|recovery|invitation 등
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const supabase = await createClient()
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeErr) {
    console.error("Auth callback error:", exchangeErr)
    const errType = classifyAuthError(exchangeErr)
    return NextResponse.redirect(`${origin}/auth/link-expired?type=${type}&error=${errType}`)
  }

  // 세션 교환 성공 → 현재 사용자
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  // 1) 프로필 생성: 회원가입/소셜 로그인 때만 시도(복구/초대 등은 스킵)
  if (type === "signup" || type === "magiclink" || type === "oauth") {
    const { data: profileResult } = await supabase.rpc("create_user_profile")
    // 실패해도 하드 리다이렉트는 하지 말고, 콘솔만
    if (profileResult && (profileResult as { success: boolean }).success === false) {
      console.error("create_user_profile failed:", (profileResult as { error?: string }).error)
    }
  }

  // 2) 온보딩/승인 상태는 users 자기 레코드 SELECT로 판단 (RLS: users_self_select 필요)
  //    필요한 필드만 최소 선택
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("onboarding_completed, role_code, approval_status")
    .eq("id", user.id)
    .maybeSingle()

  // 조회가 막히면(정책 문제 등) 안전하게 온보딩으로 보냄
  if (meErr) {
    console.warn("users self select failed:", meErr)
    return NextResponse.redirect(
      `${origin}/auth/onboarding?email=${encodeURIComponent(user.email || "")}&verified=true`
    )
  }

  // 프로필이 아직 없으면(드문 케이스) 온보딩으로
  if (!me) {
    return NextResponse.redirect(
      `${origin}/auth/onboarding?email=${encodeURIComponent(user.email || "")}&verified=true`
    )
  }

  // 온보딩 미완료 → 온보딩
  if (!me.onboarding_completed) {
    return NextResponse.redirect(
      `${origin}/auth/onboarding?email=${encodeURIComponent(user.email || "")}&verified=true`
    )
  }

  // Owner만 승인 상태 확인 → pending이면 대기 페이지
  if (me.role_code === "owner") {
    if (me.approval_status === "pending") {
      return NextResponse.redirect(`${origin}/auth/pending-approval`)
    }
    if (me.approval_status === "rejected") {
      return NextResponse.redirect(`${origin}/auth/login?error=rejected`)
    }
  }

  // 모두 통과 → 대시보드
  return NextResponse.redirect(`${origin}/dashboard`)
}
