/**
 * 관리자 감사 로그 기록 헬퍼
 *
 * 권한 변경·삭제·구성 변경 등 보안 관점에서 추적이 필요한 액션에서 호출한다.
 * fire-and-forget — 감사 기록 실패가 본 작업을 실패시키면 안 되므로 절대 throw하지 않는다.
 */

import type { createServiceRoleClient } from '@/lib/supabase/service-role'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export interface AuditLogEntry {
  /** 플랫폼 레벨 액션은 null 허용 */
  tenantId: string | null
  actorUserId: string | null
  actorEmail?: string | null
  /** 도메인.동사 형식 — 예: 'student.delete', 'subscription.set_plan', 'user.approve' */
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}

export async function recordAuditLog(
  supabase: ServiceClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabase.from('admin_audit_logs').insert({
      tenant_id: entry.tenantId,
      actor_user_id: entry.actorUserId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    })
    if (error) {
      console.error('[recordAuditLog] Insert failed:', entry.action, error.message)
    }
  } catch (error) {
    console.error('[recordAuditLog] Error (silent):', entry.action, error)
  }
}
