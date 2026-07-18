/**
 * 피처 플래그 런타임 해석 (서버 전용)
 *
 * 코드의 FEATURES 상수(features.config.ts)가 기본값이고,
 * feature_flag_overrides 테이블이 재배포 없는 런타임 오버라이드다.
 * 우선순위: 테넌트별 오버라이드 > 전역 오버라이드 > 코드 기본값.
 *
 * 오버라이드 변경 시 revalidateTag('feature-flags')로 즉시 반영된다 (킬스위치).
 */

import { unstable_cache } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { FEATURES, type FeatureKey, type FeatureStatus } from '@/lib/features.config'

interface OverrideRow {
  feature_key: string
  tenant_id: string | null
  status: FeatureStatus
}

/** 전체 오버라이드 로드 (60초 캐시 + 태그 무효화) */
const getCachedOverrides = unstable_cache(
  async (): Promise<OverrideRow[]> => {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('feature_flag_overrides')
      .select('feature_key, tenant_id, status')
    if (error) {
      // 플래그 조회 실패가 서비스를 막으면 안 됨 — 코드 기본값으로 동작
      console.error('[feature-flags] Override load failed (fallback to defaults):', error.message)
      return []
    }
    return (data ?? []) as OverrideRow[]
  },
  ['feature-flag-overrides'],
  { revalidate: 60, tags: ['feature-flags'] }
)

/** 단일 기능의 유효 상태 */
export async function getEffectiveFeatureStatus(
  key: FeatureKey,
  tenantId?: string | null
): Promise<FeatureStatus> {
  const overrides = await getCachedOverrides()

  if (tenantId) {
    const tenantOverride = overrides.find(
      (o) => o.feature_key === key && o.tenant_id === tenantId
    )
    if (tenantOverride) return tenantOverride.status
  }

  const globalOverride = overrides.find(
    (o) => o.feature_key === key && o.tenant_id === null
  )
  if (globalOverride) return globalOverride.status

  return FEATURES[key]
}

/** 전체 기능의 유효 상태 맵 (관리 화면/레이아웃 전달용) */
export async function getEffectiveFeatures(
  tenantId?: string | null
): Promise<Record<FeatureKey, FeatureStatus>> {
  const overrides = await getCachedOverrides()
  const result = { ...FEATURES } as Record<FeatureKey, FeatureStatus>

  for (const override of overrides) {
    if (override.tenant_id !== null) continue
    if (override.feature_key in result) {
      result[override.feature_key as FeatureKey] = override.status
    }
  }
  if (tenantId) {
    for (const override of overrides) {
      if (override.tenant_id !== tenantId) continue
      if (override.feature_key in result) {
        result[override.feature_key as FeatureKey] = override.status
      }
    }
  }

  return result
}
