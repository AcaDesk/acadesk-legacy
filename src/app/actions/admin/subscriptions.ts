'use server'

/**
 * 플랫폼 관리자용 SaaS 구독 관리 액션
 *
 * PG 연동 전 수동 플랜 관리 단계. 모든 액션은 verifyPlatformAdmin으로 보호되며,
 * 테넌트 경계를 넘는 조회/변경이므로 일반 스태프 권한으로는 접근 불가.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyPlatformAdmin } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage, logError } from '@/lib/error-handlers'
import { recordAuditLog } from '@/lib/audit-log'

export interface TenantSubscriptionRow {
  tenantId: string
  tenantName: string
  planCode: string
  planLabel: string
  maxStudents: number | null
  status: string
  currentPeriodEnd: string | null
  studentCount: number
  notes: string | null
}

export interface SaasPlanOption {
  code: string
  label: string
  maxStudents: number | null
  monthlyPrice: number
}

/**
 * 전체 테넌트의 구독 현황 (플랫폼 관리자 전용)
 */
export async function listTenantSubscriptions() {
  try {
    await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()

    const [tenantsRes, subsRes, plansRes, countsRes] = await Promise.all([
      supabase
        .from('tenants')
        .select('id, name')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('tenant_subscriptions')
        .select('tenant_id, plan_code, status, current_period_end, notes'),
      supabase
        .from('ref_saas_plans')
        .select('code, label, max_students, monthly_price')
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('students')
        .select('tenant_id')
        .is('deleted_at', null),
    ])

    if (tenantsRes.error) throw tenantsRes.error
    if (subsRes.error) throw subsRes.error
    if (plansRes.error) throw plansRes.error
    if (countsRes.error) throw countsRes.error

    const subByTenant = new Map(
      (subsRes.data ?? []).map((s) => [s.tenant_id, s])
    )
    const planByCode = new Map(
      (plansRes.data ?? []).map((p) => [p.code, p])
    )
    const countByTenant = new Map<string, number>()
    for (const row of countsRes.data ?? []) {
      countByTenant.set(row.tenant_id, (countByTenant.get(row.tenant_id) ?? 0) + 1)
    }

    const rows: TenantSubscriptionRow[] = (tenantsRes.data ?? []).map((tenant) => {
      const sub = subByTenant.get(tenant.id)
      const planCode = sub?.plan_code ?? 'trial'
      const plan = planByCode.get(planCode)
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        planCode,
        planLabel: plan?.label ?? planCode,
        maxStudents: plan?.max_students ?? null,
        status: sub?.status ?? 'active',
        currentPeriodEnd: sub?.current_period_end ?? null,
        studentCount: countByTenant.get(tenant.id) ?? 0,
        notes: sub?.notes ?? null,
      }
    })

    const plans: SaasPlanOption[] = (plansRes.data ?? []).map((p) => ({
      code: p.code,
      label: p.label,
      maxStudents: p.max_students,
      monthlyPrice: p.monthly_price,
    }))

    return { success: true as const, data: { rows, plans }, error: null }
  } catch (error) {
    logError(error, { action: 'listTenantSubscriptions' })
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

const setPlanSchema = z.object({
  tenantId: z.string().uuid(),
  planCode: z.string().min(1),
  currentPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

/**
 * 테넌트 플랜 지정/변경 (플랫폼 관리자 전용)
 */
export async function setTenantPlan(input: z.infer<typeof setPlanSchema>) {
  try {
    const admin = await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()
    const validated = setPlanSchema.parse(input)

    // 플랜 코드 유효성 확인
    const { data: plan, error: planError } = await supabase
      .from('ref_saas_plans')
      .select('code')
      .eq('code', validated.planCode)
      .eq('active', true)
      .maybeSingle()
    if (planError) throw planError
    if (!plan) throw new Error('유효하지 않은 플랜입니다')

    // undefined 필드는 기존 값 유지 (플랜만 바꿀 때 메모/만료일이 지워지지 않도록)
    const { error } = await supabase
      .from('tenant_subscriptions')
      .upsert(
        {
          tenant_id: validated.tenantId,
          plan_code: validated.planCode,
          status: 'active',
          ...(validated.currentPeriodEnd !== undefined && {
            current_period_end: validated.currentPeriodEnd,
          }),
          ...(validated.notes !== undefined && { notes: validated.notes }),
        },
        { onConflict: 'tenant_id' }
      )
    if (error) throw error

    void recordAuditLog(supabase, {
      tenantId: validated.tenantId,
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: 'subscription.set_plan',
      targetType: 'tenant',
      targetId: validated.tenantId,
      details: { planCode: validated.planCode },
    })

    revalidatePath('/admin/subscriptions')
    return { success: true as const, error: null }
  } catch (error) {
    logError(error, { action: 'setTenantPlan' })
    return { success: false as const, error: getErrorMessage(error) }
  }
}
