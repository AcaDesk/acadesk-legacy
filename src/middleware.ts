/**
 * Middleware
 *
 * ✅ 역할: Supabase 세션 쿠키 refresh만 수행
 * ❌ 하지 않음: DB 조회, 역할/권한 판별, 전역 리다이렉션
 *
 * 리다이렉션·권한 분기는 서버 레이아웃/페이지 + 서버 액션에서 처리
 *
 * 이점:
 * - 캐싱/정적 최적화를 해치지 않음
 * - 디버깅이 쉬워짐
 * - 페이지 서버 컴포넌트에서 redirect()로 자연스럽게 라우팅 가능
 * - service_role 사용 시 그 자리에서 테넌트/역할 재검증
 */

import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Supabase 세션 최신화 (쿠키 refresh)
  return updateSession(request)
}

// 정적 자산/내부 경로는 제외
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)',
  ],
}
