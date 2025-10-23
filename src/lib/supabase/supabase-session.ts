import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isPublicPath } from "@/lib/route-guards"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === "/auth/callback") return NextResponse.next({ request }) // 콜백은 완전 우회

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 공개 경로는 그대로 통과
  if (isPublicPath(pathname)) return response

  // 보호 경로: 비로그인은 로그인으로만
  if (!user && pathname !== "/auth/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 로그인 상태면 통과 (이메일/온보딩은 서버 레이아웃에서)
  return response
}