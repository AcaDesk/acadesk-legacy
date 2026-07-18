/**
 * SaaS 플랜 학생 수 게이팅 헬퍼
 *
 * 테넌트 구독 플랜의 max_students 한도를 학생 등록 경로에서 강제한다.
 * 구독 레코드가 없는 테넌트(신규)는 trial 한도로 취급한다.
 * (기존 테넌트는 migration 20260718000002가 unlimited로 백필함)
 */

import type { createServiceRoleClient } from '@/lib/supabase/service-role'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/** 구독 레코드 부재 시 적용되는 기본(체험) 한도 */
const TRIAL_FALLBACK = { planCode: 'trial', planLabel: '무료 체험', maxStudents: 30 }

export interface StudentQuota {
  allowed: boolean
  current: number
  /** null = 무제한 */
  max: number | null
  planCode: string
  planLabel: string
}

/**
 * addCount명 추가 등록이 플랜 한도 내인지 확인한다.
 * 판정 쿼리 실패 시 fail-open (과금 게이트가 서비스 장애를 만들면 안 됨 — 로그로 관측).
 */
export async function checkStudentQuota(
  supabase: ServiceClient,
  tenantId: string,
  addCount = 1
): Promise<StudentQuota> {
  try {
    const [subRes, countRes] = await Promise.all([
      supabase
        .from('tenant_subscriptions')
        .select('plan_code, status, ref_saas_plans ( label, max_students )')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
    ])

    if (subRes.error || countRes.error) {
      console.error('[checkStudentQuota] Query failed (fail-open):', {
        subError: subRes.error?.message,
        countError: countRes.error?.message,
      })
      return { allowed: true, current: 0, max: null, planCode: 'unknown', planLabel: '확인 불가' }
    }

    const current = countRes.count ?? 0

    const plan = subRes.data?.ref_saas_plans as
      | { label: string; max_students: number | null }
      | { label: string; max_students: number | null }[]
      | null
    const planInfo = Array.isArray(plan) ? plan[0] : plan

    const planCode = subRes.data?.plan_code ?? TRIAL_FALLBACK.planCode
    const planLabel = planInfo?.label ?? TRIAL_FALLBACK.planLabel
    const max = subRes.data ? (planInfo?.max_students ?? null) : TRIAL_FALLBACK.maxStudents

    return {
      allowed: max === null || current + addCount <= max,
      current,
      max,
      planCode,
      planLabel,
    }
  } catch (error) {
    console.error('[checkStudentQuota] Error (fail-open):', error)
    return { allowed: true, current: 0, max: null, planCode: 'unknown', planLabel: '확인 불가' }
  }
}

/** 한도 초과 시 사용자 안내 메시지 */
export function quotaExceededMessage(quota: StudentQuota, addCount = 1): string {
  const attempted = quota.current + addCount
  return `현재 플랜(${quota.planLabel})의 학생 수 한도는 ${quota.max}명입니다. (현재 ${quota.current}명, 등록 시 ${attempted}명) 플랜 업그레이드가 필요합니다.`
}
