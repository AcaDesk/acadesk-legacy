import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createUserProfileServer } from "@/app/actions/onboarding"

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
    console.error("[auth/callback] No user after session exchange")
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  // ✅ 자동 프로필 생성 (SERVICE ROLE)
  // 이메일 인증 직후 프로필이 없으면 생성합니다.
  try {
    const profileResult = await createUserProfileServer(user.id)

    if (!profileResult.success) {
      console.error("[auth/callback] Profile creation failed:", profileResult.error)
      // 프로필 생성 실패 시 재시도 페이지로
      return NextResponse.redirect(`${origin}/auth/pending?error=profile_creation_failed`)
    }

    console.log(`[auth/callback] Profile created/verified for user ${user.id}`)
  } catch (error) {
    console.error("[auth/callback] Profile creation error:", error)
    // 에러가 발생해도 사용자를 pending 페이지로 보내서 수동 재시도 가능하게 함
    return NextResponse.redirect(`${origin}/auth/pending?error=profile_creation_error`)
  }

  // ✅ 온보딩 상태 확인 후 적절한 페이지로 리다이렉트
  try {
    const { data: stageData, error: stageError } = await supabase.rpc('get_auth_stage', {
      p_invite_token: null,
    })

    if (stageError) {
      console.error("[auth/callback] get_auth_stage error:", stageError)
      // Stage 확인 실패 시 로그인 페이지로 (클라이언트에서 다시 확인)
      return NextResponse.redirect(`${origin}/auth/login?verified=true&email=${encodeURIComponent(user.email || "")}`)
    }

    const response = stageData as { ok: boolean; stage?: { code: string; next_url?: string } }

    if (!response?.ok || !response.stage) {
      console.warn("[auth/callback] Invalid stage response:", response)
      return NextResponse.redirect(`${origin}/auth/login?verified=true&email=${encodeURIComponent(user.email || "")}`)
    }

    const { code: stageCode, next_url: nextUrl } = response.stage

    console.log(`[auth/callback] User stage: ${stageCode}, next_url: ${nextUrl || 'none'}`)

    // 온보딩 상태에 따라 리다이렉트
    if (nextUrl) {
      return NextResponse.redirect(`${origin}${nextUrl}`)
    }

    // READY 상태면 대시보드로
    if (stageCode === 'READY') {
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // 기타 상태는 로그인 페이지로 (클라이언트 라우팅에 맡김)
    return NextResponse.redirect(`${origin}/auth/login?verified=true&email=${encodeURIComponent(user.email || "")}`)
  } catch (error) {
    console.error("[auth/callback] Stage check error:", error)
    // 에러 발생 시 로그인 페이지로
    return NextResponse.redirect(`${origin}/auth/login?verified=true&email=${encodeURIComponent(user.email || "")}`)
  }
}
