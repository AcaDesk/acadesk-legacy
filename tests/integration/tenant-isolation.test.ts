// @vitest-environment node
/**
 * 테넌트 격리 회귀 테스트 (통합)
 *
 * 두 테넌트를 시드한 뒤, 앱이 사용하는 쿼리/RPC 패턴이 테넌트 경계를
 * 넘지 못하는지 검증한다. service_role은 RLS를 우회하므로 이 격리는
 * 전적으로 앱 레벨 tenant_id 필터·RPC 내부 검증에 달려 있고,
 * 이 테스트가 그 회귀 안전망이다.
 *
 * 실행 방법 (로컬 Supabase 대상):
 *   supabase start
 *   TEST_SUPABASE_URL=http://127.0.0.1:54321 \
 *   TEST_SUPABASE_SERVICE_ROLE_KEY=<supabase status의 service_role key> \
 *   pnpm test:integration
 *
 * 환경변수 미설정 시 전체 skip (일반 pnpm test:run에 영향 없음).
 * ⚠️ 운영 DB 키로는 절대 실행하지 말 것 — 테스트 테넌트를 생성/삭제한다.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const TEST_URL = process.env.TEST_SUPABASE_URL
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
const enabled = Boolean(TEST_URL && TEST_KEY)

const RUN_ID = `iso-test-${Math.random().toString(36).slice(2, 10)}`

interface SeededTenant {
  tenantId: string
  studentId: string
  guardianId: string
}

async function seedTenant(db: SupabaseClient, label: string): Promise<SeededTenant> {
  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({ name: `${RUN_ID}-${label}`, slug: `${RUN_ID}-${label}` })
    .select('id')
    .single()
  if (tenantError) throw tenantError

  // 앱과 동일한 경로(원자화 RPC)로 학생+보호자 생성
  const { data: rpcData, error: rpcError } = await db.rpc('create_student_complete', {
    p_tenant_id: tenant.id,
    p_student: {
      name: `학생-${label}`,
      student_code: `${RUN_ID}-${label}`,
      grade: '중1',
    },
    p_new_guardian: {
      name: `보호자-${label}`,
      phone: '010-0000-0000',
    },
    p_existing_guardian_id: null,
    p_link: { is_primary: true },
  })
  if (rpcError) throw rpcError

  const result = rpcData as { student_id: string; guardian_id: string }
  return { tenantId: tenant.id, studentId: result.student_id, guardianId: result.guardian_id }
}

describe.skipIf(!enabled)('테넌트 격리 회귀', () => {
  let db: SupabaseClient
  let tenantA: SeededTenant
  let tenantB: SeededTenant

  beforeAll(async () => {
    db = createClient(TEST_URL!, TEST_KEY!, { auth: { persistSession: false } })
    tenantA = await seedTenant(db, 'a')
    tenantB = await seedTenant(db, 'b')
  }, 30_000)

  afterAll(async () => {
    // tenants ON DELETE CASCADE로 하위 데이터 일괄 정리
    if (db && tenantA) await db.from('tenants').delete().eq('id', tenantA.tenantId)
    if (db && tenantB) await db.from('tenants').delete().eq('id', tenantB.tenantId)
  }, 30_000)

  it('tenant_id 필터 패턴은 자기 테넌트 학생만 반환한다', async () => {
    const { data, error } = await db
      .from('students')
      .select('id')
      .eq('tenant_id', tenantA.tenantId)
      .is('deleted_at', null)
    expect(error).toBeNull()

    const ids = (data ?? []).map((s) => s.id)
    expect(ids).toContain(tenantA.studentId)
    expect(ids).not.toContain(tenantB.studentId)
  })

  it('소유권 가드 패턴(filterOwnedStudentIds)은 타 테넌트 id를 걸러낸다', async () => {
    // src/lib/tenant-guards.ts와 동일한 쿼리 패턴
    const { data, error } = await db
      .from('students')
      .select('id')
      .eq('tenant_id', tenantA.tenantId)
      .is('deleted_at', null)
      .in('id', [tenantB.studentId])
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('detach_student_relations RPC는 타 테넌트 학생에 영향을 주지 못한다', async () => {
    const { data, error } = await db.rpc('detach_student_relations', {
      p_tenant_id: tenantA.tenantId,
      p_student_ids: [tenantB.studentId],
      p_soft_delete_students: true,
      p_unlink_guardians: true,
      p_close_open_todos: true,
    })
    expect(error).toBeNull()
    expect((data as { affected_count: number }).affected_count).toBe(0)

    // B 테넌트 학생은 삭제되지 않아야 한다
    const { data: bStudent } = await db
      .from('students')
      .select('deleted_at')
      .eq('id', tenantB.studentId)
      .single()
    expect(bStudent?.deleted_at).toBeNull()
  })

  it('create_student_complete RPC는 타 테넌트 보호자 연결을 거부한다', async () => {
    const { error } = await db.rpc('create_student_complete', {
      p_tenant_id: tenantA.tenantId,
      p_student: {
        name: '침입 시도',
        student_code: `${RUN_ID}-x`,
      },
      p_new_guardian: null,
      // B 테넌트의 보호자를 A 테넌트 학생에 연결 시도
      p_existing_guardian_id: tenantB.guardianId,
      p_link: { is_primary: true },
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('보호자를 찾을 수 없습니다')
  })

  it('get_dashboard_stats RPC는 테넌트별 집계만 반환한다', async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await db
      .rpc('get_dashboard_stats', { p_tenant_id: tenantA.tenantId, p_today: today })
      .single()
    expect(error).toBeNull()

    // A 테넌트에는 학생 1명만 존재 — B 테넌트 학생이 집계에 섞이면 안 된다
    expect((data as { total_students: number }).total_students).toBe(1)
  })
})
