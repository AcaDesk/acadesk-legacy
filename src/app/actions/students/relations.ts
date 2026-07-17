/**
 * 학생 관계 해제 (수강/스케줄/TODO/보호자) — RPC 래퍼
 *
 * 다단계 UPDATE/DELETE가 부분 실패하면 정합성이 깨지므로,
 * 실제 쓰기는 단일 트랜잭션 RPC `detach_student_relations`
 * (migration 20260717000006)에서 원자적으로 수행한다.
 *
 * 세 흐름을 모두 커버한다:
 * - 삭제/일괄삭제: softDeleteStudents=true (students+users 소프트삭제 포함)
 * - 퇴원: withdrawalDate 지정 (students.withdrawal_date + meta 병합 포함)
 * - 관계 해제만: 기본 옵션
 */

interface DetachStudentRelationsOptions {
  tenantId: string
  studentIds: string[]
  endDate?: string
  reason?: string | null
  unlinkGuardians?: boolean
  closeOpenTodos?: boolean
  /** true면 students + student role users까지 소프트삭제 */
  softDeleteStudents?: boolean
  /** 지정 시 students.withdrawal_date 및 meta.withdrawal_reason 갱신 (퇴원 흐름) */
  withdrawalDate?: string
}

interface DetachStudentRelationsResult {
  classIds: string[]
  affectedCount: number
}

interface SupabaseRpcClient {
  rpc: (
    fn: string,
    params: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: unknown }>
}

export async function detachStudentActiveRelations(
  supabase: unknown,
  options: DetachStudentRelationsOptions
): Promise<DetachStudentRelationsResult> {
  const client = supabase as SupabaseRpcClient
  const studentIds = Array.from(new Set(options.studentIds.filter(Boolean)))

  if (studentIds.length === 0) {
    return { classIds: [], affectedCount: 0 }
  }

  const { data, error } = await client.rpc('detach_student_relations', {
    p_tenant_id: options.tenantId,
    p_student_ids: studentIds,
    p_end_date: options.endDate ?? new Date().toISOString().split('T')[0],
    p_reason: options.reason ?? null,
    p_unlink_guardians: options.unlinkGuardians ?? false,
    p_close_open_todos: options.closeOpenTodos ?? false,
    p_soft_delete_students: options.softDeleteStudents ?? false,
    p_withdrawal_date: options.withdrawalDate ?? null,
  })

  if (error) {
    throw error
  }

  const result = (data ?? {}) as { affected_count?: number; class_ids?: string[] }
  return {
    classIds: result.class_ids ?? [],
    affectedCount: result.affected_count ?? 0,
  }
}
