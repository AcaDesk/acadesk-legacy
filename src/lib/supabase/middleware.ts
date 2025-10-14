import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware용 Supabase 클라이언트
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 공개 경로
  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/signup",
    "/auth/accept-invitation",
    "/auth/verify-email",
    "/auth/callback",
    "/auth/onboarding",
    "/auth/forgot-password",
    "/auth/reset-password",
  ]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // 보호된 라우트 처리 - 로그인하지 않은 사용자
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 로그인된 사용자의 경우 온보딩 상태 확인
  if (user) {
    // 사용자 정보 조회
    const { data: userData } = await supabase
      .from("users")
      .select("approval_status, onboarding_completed, role_code")
      .eq("id", user.id)
      .single()

    // 온보딩 미완료인 경우 - 모든 사용자 (소셜/이메일 가입 모두)
    if (!userData?.onboarding_completed) {
      // 온보딩 페이지가 아니고 로그아웃도 아닌 경우
      if (
        pathname !== "/auth/onboarding" &&
        !pathname.startsWith("/auth/logout") &&
        !pathname.startsWith("/auth/callback")
      ) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/onboarding"
        return NextResponse.redirect(url)
      }
    }
    // 온보딩 완료 후 approval_status 확인
    else if (userData?.onboarding_completed) {
      // 승인 대기 중인 경우 (원장만 해당)
      if (
        userData?.approval_status === "pending" &&
        userData?.role_code === "owner"
      ) {
        if (
          pathname !== "/auth/pending-approval" &&
          !pathname.startsWith("/auth/logout")
        ) {
          const url = request.nextUrl.clone()
          url.pathname = "/auth/pending-approval"
          return NextResponse.redirect(url)
        }
      }
      // 승인 완료된 사용자
      else if (userData?.approval_status === "approved") {
        // auth 페이지 접근 시 대시보드로 리다이렉트 (로그아웃 제외)
        if (
          pathname.startsWith("/auth") &&
          !pathname.startsWith("/auth/logout")
        ) {
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }

        // 루트 경로는 랜딩 페이지로 유지 (redirect 제거)
        // LandingHeader에서 로그인 상태에 따라 다른 UI를 보여줌
      }
    }
  }

  // 로그인하지 않은 사용자도 루트 경로 접근 허용 (랜딩 페이지 표시)

  return supabaseResponse
}
