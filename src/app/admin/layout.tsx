import { redirect } from 'next/navigation'
import { verifyPlatformAdmin } from '@/lib/auth/verify-permission'

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

  return <>{children}</>
}
