import { listTenantSubscriptions } from '@/app/actions/admin/subscriptions'
import { SubscriptionsTable } from './subscriptions-table'

export const dynamic = 'force-dynamic'

/**
 * 플랫폼 관리자 — 테넌트 구독(플랜) 관리
 * 인가는 admin/layout.tsx의 verifyPlatformAdmin 가드가 담당한다.
 */
export default async function AdminSubscriptionsPage() {
  const result = await listTenantSubscriptions()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-destructive">구독 현황을 불러오지 못했습니다: {result.error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
        <p className="text-muted-foreground">
          테넌트별 SaaS 플랜을 관리합니다. (PG 연동 전 수동 관리 단계)
        </p>
      </div>
      <SubscriptionsTable rows={result.data.rows} plans={result.data.plans} />
    </div>
  )
}
