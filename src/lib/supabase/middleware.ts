import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isPublicPath } from "@/lib/route-guards"

/**
 * Middleware용 Supabase 클라이언트 + 세션 관리
 *
 * ⚠️ 중요: 미들웨어에서는 DB SELECT를 하지 않습니다!
 * - 세션이 anon일 때 RLS에 막혀 403 에러 발생
 * - 온보딩/승인 상태 확인은 페이지에서 RPC로 처리
 *
 * 미들웨어 역할:
 * 1. 세션 쿠키 유지/갱신
 * 2. 인증 상태만 확인 (auth.getUser)
 * 3. 기본 라우팅 (로그인 여부, 이메일 인증 여부만)
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ⚠️ CRITICAL: /auth/callback은 완전히 우회 (이메일 스캐너 대응)
  // - code 파라미터가 유실되지 않도록 어떤 리다이렉트도 하지 않음
  // - 세션 체크도 하지 않음 (RLS 위험)
  if (pathname === "/auth/callback") {
    return NextResponse.next({ request })
  }

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

  // 세션만 확인 (DB 접근 X)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 공개 경로 확인 (route-guards에서 중앙 관리)
  const isPublic = isPublicPath(pathname)

  // 보호된 라우트 처리 - 로그인하지 않은 사용자
  // 무한 리다이렉트 방지: 이미 로그인 페이지면 재리다이렉트 금지
  if (!user && !isPublic && pathname !== "/auth/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 로그인된 사용자 - 최소한의 라우팅만
  if (user) {
    // 이메일 인증 확인
    if (
      !user.email_confirmed_at &&
      pathname !== "/auth/verify-email"
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/verify-email"
      if (user.email) {
        url.searchParams.set("email", user.email)
      }
      return NextResponse.redirect(url)
    }

    // ⚠️ 온보딩/승인 상태 확인은 페이지 레벨에서 처리
    // 미들웨어에서 DB SELECT 하면 RLS 403 위험
    // → onboarding/pending-approval 페이지에서 RPC 호출로 확인
  }

  return supabaseResponse
}
