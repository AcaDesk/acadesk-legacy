import { listFeatureFlags, listTenantFeatureOverrides } from '@/app/actions/admin/feature-flags'
import { FeatureFlagsTable } from './feature-flags-table'
import { TenantOverridesTable } from './tenant-overrides-table'

export const dynamic = 'force-dynamic'

/**
 * 플랫폼 관리자 — 피처 플래그 관리 (전역 킬스위치 + 테넌트별 오버라이드)
 * 인가는 admin/layout.tsx의 verifyPlatformAdmin 가드가 담당한다.
 */
export default async function AdminFeatureFlagsPage() {
  const [flagsResult, tenantResult] = await Promise.all([
    listFeatureFlags(),
    listTenantFeatureOverrides(),
  ])

  if (!flagsResult.success || !flagsResult.data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-destructive">플래그 현황을 불러오지 못했습니다: {flagsResult.error}</p>
      </div>
    )
  }

  const tenantData = tenantResult.success && tenantResult.data
    ? tenantResult.data
    : { rows: [], tenants: [] }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">피처 플래그</h1>
        <p className="text-muted-foreground">
          재배포 없이 기능 상태를 변경합니다. 서버 게이트가 있는 페이지에 60초 내 반영됩니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">전역 상태</h2>
        <FeatureFlagsTable rows={flagsResult.data} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">테넌트별 오버라이드</h2>
        <TenantOverridesTable rows={tenantData.rows} tenants={tenantData.tenants} />
      </section>
    </div>
  )
}
