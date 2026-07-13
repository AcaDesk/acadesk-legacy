/**
 * 테넌트 소유권 가드 유틸리티
 *
 * Server Action에서 클라이언트가 넘긴 id 목록을 그대로 INSERT하기 전,
 * 해당 id들이 현재 테넌트 소속인지 검증하는 데 사용합니다.
 * (service_role 클라이언트는 RLS를 우회하므로 앱 레벨에서 명시적으로 걸러야 함)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 주어진 student_id 목록 중 현재 테넌트 소속(미삭제)인 것만 반환합니다.
 * 순서/중복은 보존하지 않으며, 소유하지 않은 id는 조용히 제외됩니다.
 *
 * @example
 * const ownedIds = await filterOwnedStudentIds(supabase, tenantId, input.studentIds)
 * if (ownedIds.length === 0) return { success: false, error: '대상 학생을 찾을 수 없습니다.' }
 */
export async function filterOwnedStudentIds(
  supabase: SupabaseClient,
  tenantId: string,
  studentIds: string[]
): Promise<string[]> {
  if (studentIds.length === 0) return []

  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .in('id', studentIds)

  if (error) throw error
  return (data ?? []).map((s) => s.id as string)
}
