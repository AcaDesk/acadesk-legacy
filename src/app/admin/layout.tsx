import Link from 'next/link'
import { redirect } from 'next/navigation'
import { verifyPlatformAdmin } from '@/lib/auth/verify-permission'

const ADMIN_NAV = [
  { href: '/admin/approvals', label: '가입 승인' },
  { href: '/admin/subscriptions', label: '구독 관리' },
  { href: '/admin/feature-flags', label: '피처 플래그' },
  { href: '/admin/audit-logs', label: '감사 로그' },
]

/**
 * 플랫폼 관리자 라우트 그룹 가드 (심층방어)
 *
 * 개별 페이지의 인라인 인가 체크와 별개로, /admin 하위 전체를
 * 레이아웃 레벨에서 한 번 더 차단한다 — 새 관리자 페이지가
 * 체크를 누락해도 이 가드가 방어선이 된다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await verifyPlatformAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <>
      <nav className="border-b bg-muted/30">
        <div className="flex items-center gap-1 px-6 lg:px-8 py-2 overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-3 shrink-0">
            플랫폼 관리
          </span>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm rounded-md whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  )
}
