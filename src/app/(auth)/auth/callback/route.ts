import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
      )
    }

    // 세션 교환 성공 - 사용자 프로필 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/auth/login`)
    }

    // 사용자 프로필에서 온보딩 완료 여부 확인
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()

    // 온보딩이 완료되지 않았으면 온보딩 페이지로
    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(`${origin}/auth/onboarding`)
    }

    // 온보딩 완료된 사용자는 대시보드로
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // code가 없으면 로그인 페이지로
  return NextResponse.redirect(`${origin}/auth/login`)
}
