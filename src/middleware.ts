import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { getRouteFeatureStatus } from "@/lib/route-guards"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 피처 플래그 상태 기반 라우팅
  const featureStatus = getRouteFeatureStatus(pathname)

  if (featureStatus !== null && featureStatus !== 'active') {
    // 기능이 'inactive' 또는 'maintenance' 상태인 경우
    // 페이지 컴포넌트에서 직접 처리하도록 허용 (middleware에서는 차단하지 않음)
    // 이렇게 하면 페이지 레벨의 ComingSoon/Maintenance 컴포넌트가 제대로 표시됩니다
  }

  // 세션 업데이트 (기존 로직)
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
