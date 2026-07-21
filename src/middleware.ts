/**
 * Middleware
 *
 * ✅ 역할:
 * - Supabase 세션 쿠키 refresh
 * - x-pathname 요청 헤더 추가 (AuthLayout에서 사용)
 * - Content-Security-Policy (nonce 기반, 프로덕션 전용)
 *
 * ❌ 하지 않음: DB 조회, 역할/권한 판별, 전역 리다이렉션
 *
 * 리다이렉션·권한 분기는 서버 레이아웃/페이지 + 서버 액션에서 처리
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/supabase-session'

// ============================================================================
// Content-Security-Policy
// ============================================================================
//
// nonce 기반 CSP: 요청마다 nonce를 생성해 요청 헤더(content-security-policy)에
// 실으면 Next.js가 자신이 주입하는 인라인 부트스트랩 스크립트에 nonce를
// 자동으로 붙인다. 'strict-dynamic'으로 nonce 스크립트가 로드하는 청크는
// 연쇄 허용된다. unsafe-eval 없음.
//
// ⚠️ [장애 가능성] 새 외부 리소스를 도입하면 반드시 아래 목록에 추가해야 한다.
//  - 외부 <script>(PG 결제 SDK, 카카오 지도 등) → script-src에 도메인 추가
//    또는 next/script에 nonce 전달. 누락 시 해당 기능이 조용히 동작 안 함.
//  - 외부 이미지 도메인 → img-src (현재 DiceBear 아바타만 허용)
//  - 외부 API fetch/웹소켓 → connect-src (현재 Supabase·Sentry만 허용)
//  - Supabase 커스텀 도메인 전환 시 connect-src의 *.supabase.co 수정 필요
//
// 개발 모드는 CSP를 걸지 않는다 — HMR(eval·ws)·로컬 Supabase(http://127.0.0.1)가
// 전부 위반으로 잡혀 개발이 불가능해지기 때문. 프로덕션 동작 검증은 배포본에서.
const IS_PROD = process.env.NODE_ENV === 'production'

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic': nonce 스크립트가 로드하는 Next 청크를 연쇄 허용.
    // 지원 브라우저에서는 'self'가 무시되지만 구형 브라우저 폴백으로 유지.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // React 인라인 style 속성 + 라이브러리(recharts 등) 인라인 스타일용.
    // 스타일 XSS는 스크립트 대비 저위험이라 실용적 트레이드오프.
    `style-src 'self' 'unsafe-inline'`,
    // blob:/data:: 차트 내보내기·아바타 플레이스홀더, DiceBear: 학생 아바타
    `img-src 'self' blob: data: https://api.dicebear.com`,
    `font-src 'self' data:`,
    // Supabase(REST/Auth/Storage + Realtime 웹소켓), Sentry 에러 수집(리전별 ingest)
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
    // Serwist 서비스 워커
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // react-to-print 등 자체 iframe만 허용
    `frame-src 'self'`,
    // 외부 페이지에 의한 삽입 차단 (X-Frame-Options: DENY와 동일 의도)
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

// [장애 가능성] /offline은 빌드 시 프리렌더 + 서비스 워커 프리캐시 대상이라
// HTML에 per-request nonce를 넣을 수 없다. nonce CSP를 걸면 오프라인 폴백
// 페이지의 부트스트랩 스크립트가 차단되므로, 이 경로만 unsafe-inline 폴백을 쓴다.
const STATIC_PAGE_CSP = buildCsp('__static__').replace(
  /script-src [^;]*/,
  `script-src 'self' 'unsafe-inline'`
)

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 요청 헤더에 현재 pathname 추가 (AuthLayout에서 무한 루프 방지용)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let csp: string | null = null
  if (IS_PROD) {
    if (pathname === '/offline') {
      csp = STATIC_PAGE_CSP
    } else {
      const nonce = btoa(crypto.randomUUID())
      csp = buildCsp(nonce)
      requestHeaders.set('x-nonce', nonce)
    }
    // 요청 헤더의 CSP를 보고 Next.js가 자체 인라인 스크립트에 nonce를 부여한다
    requestHeaders.set('content-security-policy', csp)
  }

  // Supabase 세션 최신화
  const response =
    (await updateSession(request, requestHeaders)) ??
    NextResponse.next({ request: { headers: requestHeaders } })

  if (csp) {
    response.headers.set('Content-Security-Policy', csp)
  }
  return response
}

// 정적 자산/내부 경로는 제외 (SW, manifest 포함)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|sw\\.js|sw\\.js\\.map|swe-worker|workbox-|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)',
  ],
}
