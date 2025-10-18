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

  // 🔍 로깅: 콜백 진입 (스캐너 감지용)
  console.log("[auth/callback] hit:", {
    fullUrl: url.toString(),
    params: Object.fromEntries(url.searchParams),
    timestamp: new Date().toISOString(),
  })

  const code = url.searchParams.get("code")
  const type = (url.searchParams.get("type") || "signup").toLowerCase() // signup|recovery|invitation 등
  const origin = url.origin

  if (!code) {
    console.warn("[auth/callback] missing code param")
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const supabase = await createClient()
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeErr) {
    // 🔍 로깅: 교환 실패 (스캐너가 먼저 호출했는지 확인)
    console.error("[auth/callback] exchange error:", {
      message: exchangeErr.message,
      status: exchangeErr.status,
      code: exchangeErr.code,
      name: exchangeErr.name,
      fullError: exchangeErr,
    })
    const errType = classifyAuthError(exchangeErr)
    return NextResponse.redirect(`${origin}/auth/link-expired?type=${type}&error=${errType}`)
  }

  console.log("[auth/callback] exchange success")

  // 세션 교환 성공 → 현재 사용자
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  // 인증 성공 → 로그인 페이지로 리디렉트
  // routeAfterLogin이 클라이언트에서 자동으로 올바른 경로로 보냄
  // (이메일 인증 플래그 추가)
  return NextResponse.redirect(
    `${origin}/auth/login?verified=true&email=${encodeURIComponent(user.email || "")}`
  )
}
