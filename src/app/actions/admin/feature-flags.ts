'use server'

/**
 * 플랫폼 관리자용 피처 플래그 오버라이드 관리
 *
 * 전역(킬스위치) 및 테넌트별 오버라이드를 재배포 없이 변경한다.
 * 변경은 revalidateTag('feature-flags')로 즉시 반영되고 감사 로그에 남는다.
 */

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyPlatformAdmin } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage, logError } from '@/lib/error-handlers'
import { recordAuditLog } from '@/lib/audit-log'
import { FEATURES, type FeatureKey, type FeatureStatus } from '@/lib/features.config'

export interface FeatureFlagRow {
  key: FeatureKey
  defaultStatus: FeatureStatus
  globalOverride: FeatureStatus | null
  effectiveStatus: FeatureStatus
  notes: string | null
}

/**
 * 전역 플래그 현황 (코드 기본값 + 전역 오버라이드)
 */
export async function listFeatureFlags() {
  try {
    await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()

    const { data: overrides, error } = await supabase
      .from('feature_flag_overrides')
      .select('feature_key, status, notes')
      .is('tenant_id', null)
    if (error) throw error

    const overrideByKey = new Map(
      (overrides ?? []).map((o) => [o.feature_key, o])
    )

    const rows: FeatureFlagRow[] = (Object.keys(FEATURES) as FeatureKey[]).map((key) => {
      const override = overrideByKey.get(key)
      return {
        key,
        defaultStatus: FEATURES[key],
        globalOverride: (override?.status as FeatureStatus) ?? null,
        effectiveStatus: (override?.status as FeatureStatus) ?? FEATURES[key],
        notes: override?.notes ?? null,
      }
    })

    return { success: true as const, data: rows, error: null }
  } catch (error) {
    logError(error, { action: 'listFeatureFlags' })
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export interface TenantFeatureOverrideRow {
  id: string
  tenantId: string
  tenantName: string
  featureKey: string
  status: FeatureStatus
  notes: string | null
  createdAt: string
}

/**
 * 테넌트별 오버라이드 현황 + 테넌트 목록 (추가 폼용)
 */
export async function listTenantFeatureOverrides() {
  try {
    await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()

    const [overridesRes, tenantsRes] = await Promise.all([
      supabase
        .from('feature_flag_overrides')
        .select('id, tenant_id, feature_key, status, notes, created_at')
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('tenants')
        .select('id, name')
        .is('deleted_at', null)
        .order('name', { ascending: true }),
    ])

    if (overridesRes.error) throw overridesRes.error
    if (tenantsRes.error) throw tenantsRes.error

    const tenants = (tenantsRes.data ?? []).map((t) => ({ id: t.id, name: t.name }))
    const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]))

    const rows: TenantFeatureOverrideRow[] = (overridesRes.data ?? []).map((o) => ({
      id: o.id,
      tenantId: o.tenant_id as string,
      tenantName: tenantNameById.get(o.tenant_id as string) ?? '(삭제된 테넌트)',
      featureKey: o.feature_key,
      status: o.status as FeatureStatus,
      notes: o.notes,
      createdAt: o.created_at,
    }))

    return { success: true as const, data: { rows, tenants }, error: null }
  } catch (error) {
    logError(error, { action: 'listTenantFeatureOverrides' })
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

const setTenantOverrideSchema = z.object({
  tenantId: z.string().uuid(),
  featureKey: z.string().min(1),
  /** null = 오버라이드 제거 (전역/기본값으로 복귀) */
  status: z.enum(['active', 'inactive', 'maintenance', 'beta', 'deprecated']).nullable(),
  notes: z.string().trim().max(300).optional(),
})

/**
 * 테넌트별 오버라이드 설정/해제 — 특정 학원에만 기능을 열거나 잠근다.
 * 우선순위: 테넌트별 > 전역 > 코드 기본값.
 */
export async function setTenantFeatureFlag(input: z.infer<typeof setTenantOverrideSchema>) {
  try {
    const admin = await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()
    const validated = setTenantOverrideSchema.parse(input)

    if (!(validated.featureKey in FEATURES)) {
      throw new Error('알 수 없는 기능 키입니다')
    }

    // 테넌트 존재 확인
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', validated.tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (tenantError) throw tenantError
    if (!tenant) throw new Error('테넌트를 찾을 수 없습니다')

    // 부분 유니크(COALESCE 표현식)라 upsert onConflict를 못 쓰므로 delete+insert
    const { error: deleteError } = await supabase
      .from('feature_flag_overrides')
      .delete()
      .eq('feature_key', validated.featureKey)
      .eq('tenant_id', validated.tenantId)
    if (deleteError) throw deleteError

    if (validated.status !== null) {
      const { error: insertError } = await supabase.from('feature_flag_overrides').insert({
        feature_key: validated.featureKey,
        tenant_id: validated.tenantId,
        status: validated.status,
        notes: validated.notes ?? null,
      })
      if (insertError) throw insertError
    }

    void recordAuditLog(supabase, {
      tenantId: validated.tenantId,
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: 'feature_flag.set_tenant',
      targetType: 'feature',
      targetId: validated.featureKey,
      details: { status: validated.status, notes: validated.notes ?? null },
    })

    revalidateTag('feature-flags')
    revalidatePath('/admin/feature-flags')
    return { success: true as const, error: null }
  } catch (error) {
    logError(error, { action: 'setTenantFeatureFlag' })
    return { success: false as const, error: getErrorMessage(error) }
  }
}

const setOverrideSchema = z.object({
  featureKey: z.string().min(1),
  /** null = 오버라이드 제거 (코드 기본값으로 복귀) */
  status: z.enum(['active', 'inactive', 'maintenance', 'beta', 'deprecated']).nullable(),
  notes: z.string().trim().max(300).optional(),
})

/**
 * 전역 오버라이드 설정/해제 (킬스위치)
 */
export async function setGlobalFeatureFlag(input: z.infer<typeof setOverrideSchema>) {
  try {
    const admin = await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()
    const validated = setOverrideSchema.parse(input)

    if (!(validated.featureKey in FEATURES)) {
      throw new Error('알 수 없는 기능 키입니다')
    }

    if (validated.status === null) {
      const { error } = await supabase
        .from('feature_flag_overrides')
        .delete()
        .eq('feature_key', validated.featureKey)
        .is('tenant_id', null)
      if (error) throw error
    } else {
      // 부분 유니크(COALESCE 표현식)라 upsert onConflict를 못 쓰므로 delete+insert
      const { error: deleteError } = await supabase
        .from('feature_flag_overrides')
        .delete()
        .eq('feature_key', validated.featureKey)
        .is('tenant_id', null)
      if (deleteError) throw deleteError

      const { error: insertError } = await supabase.from('feature_flag_overrides').insert({
        feature_key: validated.featureKey,
        tenant_id: null,
        status: validated.status,
        notes: validated.notes ?? null,
      })
      if (insertError) throw insertError
    }

    void recordAuditLog(supabase, {
      tenantId: null,
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: 'feature_flag.set_global',
      targetType: 'feature',
      targetId: validated.featureKey,
      details: { status: validated.status, notes: validated.notes ?? null },
    })

    revalidateTag('feature-flags')
    revalidatePath('/admin/feature-flags')
    return { success: true as const, error: null }
  } catch (error) {
    logError(error, { action: 'setGlobalFeatureFlag' })
    return { success: false as const, error: getErrorMessage(error) }
  }
}
