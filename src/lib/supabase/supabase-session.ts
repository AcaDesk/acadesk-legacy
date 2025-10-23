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

  const { data: { user } } = await supabase.auth.getUser()
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