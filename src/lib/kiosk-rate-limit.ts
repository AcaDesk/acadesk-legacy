/**
 * 키오스크 인증 레이트리밋 (DB 기반)
 *
 * 키오스크 인증의 비밀 공간(4자리 PIN/전화번호 뒷자리)은 10^4으로 작아
 * 시도 제한이 없으면 원격 전수 대입이 가능하다. 서버리스 환경에서는
 * 인메모리 카운터가 인스턴스마다 초기화되므로 kiosk_auth_attempts 테이블에
 * 실패 시도를 기록하고 시간 윈도우 내 실패 횟수로 차단을 판정한다.
 *
 * 2중 한도:
 * - 식별자별: 같은 대상(학생 코드/학생 ID/전화 뒷자리)에 대한 반복 시도 차단
 * - 테넌트별: 식별자를 바꿔가며 하는 전수 대입(enumeration) 차단
 *
 * 판정 쿼리 실패 시에는 fail-open한다 — DB 일시 장애가 등원 시간대
 * 출석 불가 사태로 번지는 것보다 낫다 (실패는 로그로 관측).
 */

import type { createServiceRoleClient } from '@/lib/supabase/service-role'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

const IDENTIFIER_WINDOW_MS = 5 * 60 * 1000
const IDENTIFIER_MAX_FAILURES = 5
const TENANT_WINDOW_MS = 10 * 60 * 1000
const TENANT_MAX_FAILURES = 30
const RETENTION_MS = 24 * 60 * 60 * 1000

export const KIOSK_RATE_LIMIT_ERROR =
  '시도 횟수를 초과했습니다. 잠시 후 다시 시도하거나 선생님께 문의해주세요.'

/** 윈도우 내 실패 횟수가 한도를 넘었는지 판정 */
export async function isKioskAuthRateLimited(
  supabase: ServiceClient,
  tenantId: string,
  identifier: string
): Promise<boolean> {
  const now = Date.now()
  const identifierSince = new Date(now - IDENTIFIER_WINDOW_MS).toISOString()
  const tenantSince = new Date(now - TENANT_WINDOW_MS).toISOString()

  const [identifierRes, tenantRes] = await Promise.all([
    supabase
      .from('kiosk_auth_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('identifier', identifier)
      .eq('success', false)
      .gte('attempted_at', identifierSince),
    supabase
      .from('kiosk_auth_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('success', false)
      .gte('attempted_at', tenantSince),
  ])

  if (identifierRes.error || tenantRes.error) {
    console.error('[kiosk-rate-limit] Count query failed (fail-open):', {
      identifierError: identifierRes.error?.message,
      tenantError: tenantRes.error?.message,
    })
    return false
  }

  return (
    (identifierRes.count ?? 0) >= IDENTIFIER_MAX_FAILURES ||
    (tenantRes.count ?? 0) >= TENANT_MAX_FAILURES
  )
}

/** 인증 실패 기록 + 보존 기간 지난 행 정리 (베스트 에포트) */
export async function recordKioskAuthFailure(
  supabase: ServiceClient,
  tenantId: string,
  identifier: string
): Promise<void> {
  const { error } = await supabase
    .from('kiosk_auth_attempts')
    .insert({ tenant_id: tenantId, identifier, success: false })
  if (error) {
    console.error('[kiosk-rate-limit] Failed to record attempt:', error.message)
  }

  // 오래된 기록 정리 — 응답을 막지 않도록 결과만 로깅
  supabase
    .from('kiosk_auth_attempts')
    .delete()
    .eq('tenant_id', tenantId)
    .lt('attempted_at', new Date(Date.now() - RETENTION_MS).toISOString())
    .then(({ error: cleanupError }) => {
      if (cleanupError) {
        console.error('[kiosk-rate-limit] Cleanup failed:', cleanupError.message)
      }
    })
}

/** 인증 성공 시 해당 식별자의 실패 기록 제거 (정상 사용자 누적 잠금 방지) */
export async function clearKioskAuthFailures(
  supabase: ServiceClient,
  tenantId: string,
  identifier: string
): Promise<void> {
  const { error } = await supabase
    .from('kiosk_auth_attempts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('identifier', identifier)
  if (error) {
    console.error('[kiosk-rate-limit] Failed to clear attempts:', error.message)
  }
}
