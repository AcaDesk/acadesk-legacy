'use server'

/**
 * 플랫폼 관리자용 감사 로그 조회 액션
 *
 * admin_audit_logs는 append-only 기록이며, 조회는 플랫폼 관리자만 가능하다.
 * 테넌트 경계를 넘는 조회이므로 verifyPlatformAdmin으로 보호한다.
 */

import { z } from 'zod'
import { verifyPlatformAdmin } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage, logError } from '@/lib/error-handlers'
import { resolvePageRange, buildPaginatedResult, type PaginatedResult } from '@/lib/pagination'

export interface AuditLogRow {
  id: string
  tenantId: string | null
  tenantName: string | null
  actorEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  details: Record<string, unknown>
  createdAt: string
}

export interface AuditLogFilterOptions {
  actions: string[]
  tenants: Array<{ id: string; name: string }>
}

const listAuditLogsSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  action: z.string().trim().max(100).optional(),
  tenantId: z.string().uuid().optional(),
})

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>

/**
 * 감사 로그 목록 (플랫폼 관리자 전용, 최신순 페이지네이션)
 */
export async function listAuditLogs(input: ListAuditLogsInput = {}) {
  try {
    await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()
    const validated = listAuditLogsSchema.parse(input)
    const range = resolvePageRange(validated, 30)

    let query = supabase
      .from('admin_audit_logs')
      .select('id, tenant_id, actor_email, action, target_type, target_id, details, created_at', {
        count: 'planned',
      })
      .order('created_at', { ascending: false })
      .range(range.from, range.to)

    if (validated.action) {
      query = query.eq('action', validated.action)
    }
    if (validated.tenantId) {
      query = query.eq('tenant_id', validated.tenantId)
    }

    const { data, count, error } = await query
    if (error) throw error

    // 테넌트명 매핑 (로그에 등장한 테넌트만)
    const tenantIds = Array.from(
      new Set((data ?? []).map((row) => row.tenant_id).filter(Boolean))
    ) as string[]
    const tenantNameById = new Map<string, string>()
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds)
      for (const t of tenants ?? []) tenantNameById.set(t.id, t.name)
    }

    const rows: AuditLogRow[] = (data ?? []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_id ? (tenantNameById.get(row.tenant_id) ?? null) : null,
      actorEmail: row.actor_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: (row.details ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
    }))

    const result: PaginatedResult<AuditLogRow> = buildPaginatedResult(rows, count, range)
    return { success: true as const, data: result, error: null }
  } catch (error) {
    logError(error, { action: 'listAuditLogs' })
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

/**
 * 필터 옵션 — 로그에 존재하는 액션 종류 + 전체 테넌트 목록
 */
export async function getAuditLogFilterOptions() {
  try {
    await verifyPlatformAdmin()
    const supabase = createServiceRoleClient()

    const [actionsRes, tenantsRes] = await Promise.all([
      // 액션 종류는 소수(수십 개 이내)라 전체 조회 후 dedupe
      supabase
        .from('admin_audit_logs')
        .select('action')
        .order('action', { ascending: true })
        .limit(2000),
      supabase
        .from('tenants')
        .select('id, name')
        .is('deleted_at', null)
        .order('name', { ascending: true }),
    ])

    if (actionsRes.error) throw actionsRes.error
    if (tenantsRes.error) throw tenantsRes.error

    const options: AuditLogFilterOptions = {
      actions: Array.from(new Set((actionsRes.data ?? []).map((r) => r.action))).sort(),
      tenants: (tenantsRes.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    }

    return { success: true as const, data: options, error: null }
  } catch (error) {
    logError(error, { action: 'getAuditLogFilterOptions' })
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}
