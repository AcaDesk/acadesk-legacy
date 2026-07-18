import { listFeatureFlags } from '@/app/actions/admin/feature-flags'
import { FeatureFlagsTable } from './feature-flags-table'

export const dynamic = 'force-dynamic'

/**
 * 플랫폼 관리자 — 피처 플래그 관리 (전역 오버라이드/킬스위치)
 * 인가는 admin/layout.tsx의 verifyPlatformAdmin 가드가 담당한다.
 */
export default async function AdminFeatureFlagsPage() {
  const result = await listFeatureFlags()

  if (!result.success || !result.data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-destructive">플래그 현황을 불러오지 못했습니다: {result.error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">피처 플래그</h1>
        <p className="text-muted-foreground">
          재배포 없이 기능 상태를 변경합니다. 서버 게이트가 있는 페이지에 60초 내 반영됩니다.
        </p>
      </div>
      <FeatureFlagsTable rows={result.data} />
    </div>
  )
}
