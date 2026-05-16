interface DetachStudentRelationsOptions {
  tenantId: string
  studentIds: string[]
  now?: string
  endDate?: string
  reason?: string | null
  unlinkGuardians?: boolean
  closeOpenTodos?: boolean
}

interface DetachStudentRelationsResult {
  classIds: string[]
}

interface SupabaseQueryResult {
  data: unknown
  error: unknown
}

interface SupabaseFilterBuilder extends PromiseLike<SupabaseQueryResult> {
  eq: (column: string, value: unknown) => SupabaseFilterBuilder
  in: (column: string, values: string[]) => SupabaseFilterBuilder
  is: (column: string, value: unknown) => SupabaseFilterBuilder
  neq: (column: string, value: unknown) => SupabaseFilterBuilder
}

interface SupabaseTableBuilder {
  select: (columns: string) => SupabaseFilterBuilder
  update: (payload: Record<string, unknown>) => SupabaseFilterBuilder
  delete: () => SupabaseFilterBuilder
}

interface SupabaseLikeClient {
  from: (table: string) => SupabaseTableBuilder
}

export async function detachStudentActiveRelations(
  supabase: unknown,
  options: DetachStudentRelationsOptions
): Promise<DetachStudentRelationsResult> {
  const client = supabase as SupabaseLikeClient
  const studentIds = Array.from(new Set(options.studentIds.filter(Boolean)))

  if (studentIds.length === 0) {
    return { classIds: [] }
  }

  const now = options.now ?? new Date().toISOString()
  const endDate = options.endDate ?? now.split('T')[0]
  const withdrawalReason =
    options.reason?.trim() || '학생 퇴원/삭제로 인한 자동 해제'

  const { data: activeEnrollments, error: enrollmentFetchError } = await client
    .from('class_enrollments')
    .select('class_id')
    .eq('tenant_id', options.tenantId)
    .in('student_id', studentIds)
    .eq('status', 'active')

  if (enrollmentFetchError) {
    throw enrollmentFetchError
  }

  const classIds: string[] = Array.from(
    new Set(
      ((activeEnrollments || []) as Array<{ class_id: string | null }>)
        .map((row) => row.class_id)
        .filter((classId): classId is string => Boolean(classId))
    )
  )

  const { error: enrollmentUpdateError } = await client
    .from('class_enrollments')
    .update({
      status: 'withdrawn',
      end_date: endDate,
      withdrawal_reason: withdrawalReason,
      updated_at: now,
    })
    .eq('tenant_id', options.tenantId)
    .in('student_id', studentIds)
    .eq('status', 'active')

  if (enrollmentUpdateError) {
    throw enrollmentUpdateError
  }

  const { error: scheduleUpdateError } = await client
    .from('student_schedules')
    .update({
      active: false,
      updated_at: now,
    })
    .eq('tenant_id', options.tenantId)
    .in('student_id', studentIds)
    .eq('active', true)

  if (scheduleUpdateError) {
    throw scheduleUpdateError
  }

  if (options.closeOpenTodos) {
    const { error: todoUpdateError } = await client
      .from('student_tasks')
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq('tenant_id', options.tenantId)
      .in('student_id', studentIds)
      .is('deleted_at', null)
      .is('verified_at', null)

    if (todoUpdateError) {
      throw todoUpdateError
    }
  }

  if (options.unlinkGuardians) {
    const { error: guardianDeleteError } = await client
      .from('student_guardians')
      .delete()
      .eq('tenant_id', options.tenantId)
      .in('student_id', studentIds)

    if (guardianDeleteError) {
      throw guardianDeleteError
    }
  }

  return { classIds }
}
