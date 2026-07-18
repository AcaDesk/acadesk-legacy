import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isPublicPath } from "@/lib/route-guards"

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const pathname = request.nextUrl.pathname

  // 콜백은 완전 우회
  if (pathname === "/auth/callback") {
    return NextResponse.next({ request: { headers: requestHeaders ?? request.headers } })
  }

  let response = NextResponse.next({ request: { headers: requestHeaders ?? request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders ?? request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession(): 쿠키의 세션을 읽고, 만료(임박) 시에만 리프레시 네트워크 호출.
  // 토큰이 유효한 대부분의 요청은 Auth 서버 왕복 0회 — 이전 getUser()는 매 요청
  // 왕복 1회를 페이지 렌더 앞에 직렬로 추가해 모든 네비게이션을 느리게 했다.
  //
  // 보안 노트: 여기의 user는 미검증(쿠키 신뢰) 값이지만 미들웨어의 역할은
  // UX용 리다이렉트뿐이다. 실제 보안 경계는 페이지/서버 액션의
  // requireAuth()/verifyStaff()가 수행하는 검증된 getUser()다 — 위조 쿠키는
  // 미들웨어를 통과해도 그 단계에서 차단된다.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const isPublic = isPublicPath(pathname)

  // 공개 경로는 그대로 통과
  if (isPublic) return response

  // 보호 경로: 비로그인은 로그인으로만
  if (!user && pathname !== "/auth/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 이메일 미인증이면 verify-email로
  if (user && !user.email_confirmed_at && pathname !== '/auth/verify-email') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/verify-email'
    if (user.email) url.searchParams.set('email', user.email)
    return NextResponse.redirect(url)
  }

  // 로그인 상태면 통과 (온보딩은 서버 레이아웃에서)
  return response
}