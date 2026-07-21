import Link from 'next/link'
import { headers } from 'next/headers'

/**
 * 404 페이지
 *
 * headers()를 읽어 의도적으로 동적 렌더링을 강제한다 — 기본 _not-found는
 * 빌드 시 프리렌더되는데, nonce 기반 CSP에서는 프리렌더 HTML의 인라인
 * 스크립트에 per-request nonce가 없어 차단된다(화면은 뜨지만 하이드레이션
 * 실패). 동적 렌더 시 요청 nonce가 정상 주입된다.
 */
export default async function NotFound() {
  await headers()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl font-bold tracking-tight text-muted-foreground/40">404</p>
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground">
        주소가 잘못되었거나 삭제된 페이지입니다.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        대시보드로 돌아가기
      </Link>
    </div>
  )
}
