import { describe, expect, it } from 'vitest'
import { detachStudentActiveRelations } from './relations'

type FilterCall = [string, ...unknown[]]

interface QueryCall {
  table: string
  action: 'select' | 'update' | 'delete'
  payload?: unknown
  filters: FilterCall[]
}

function createSupabaseMock(
  responses: Record<string, { data: unknown; error: unknown }> = {}
) {
  const calls: QueryCall[] = []

  return {
    calls,
    from(table: string) {
      const call: Partial<QueryCall> & { filters: FilterCall[] } = {
        table,
        filters: [],
      }

      const chain = {
        select(payload?: unknown) {
          call.action = 'select'
          call.payload = payload
          calls.push(call as QueryCall)
          return chain
        },
        update(payload: unknown) {
          call.action = 'update'
          call.payload = payload
          calls.push(call as QueryCall)
          return chain
        },
        delete() {
          call.action = 'delete'
          calls.push(call as QueryCall)
          return chain
        },
        eq(...args: unknown[]) {
          call.filters.push(['eq', ...args])
          return chain
        },
        in(...args: unknown[]) {
          call.filters.push(['in', ...args])
          return chain
        },
        is(...args: unknown[]) {
          call.filters.push(['is', ...args])
          return chain
        },
        neq(...args: unknown[]) {
          call.filters.push(['neq', ...args])
          return chain
        },
        then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
          onFulfilled?:
            | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
            | null,
          onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ): PromiseLike<TResult1 | TResult2> {
          const key = `${call.table}:${call.action}`
          return Promise.resolve(responses[key] ?? { data: null, error: null }).then(
            onFulfilled ?? undefined,
            onRejected ?? undefined
          )
        },
      }

      return chain
    },
  }
}

describe('detachStudentActiveRelations', () => {
  it('closes active operational student relations', async () => {
    const supabase = createSupabaseMock({
      'class_enrollments:select': {
        data: [{ class_id: 'class-1' }, { class_id: 'class-1' }, { class_id: 'class-2' }],
        error: null,
      },
    })

    const result = await detachStudentActiveRelations(supabase, {
      tenantId: 'tenant-1',
      studentIds: ['student-1', 'student-1', 'student-2'],
      now: '2026-05-13T10:00:00.000Z',
      endDate: '2026-05-13',
      reason: '퇴원',
      unlinkGuardians: true,
      closeOpenTodos: true,
    })

    expect(result.classIds).toEqual(['class-1', 'class-2'])

    expect(supabase.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'class_enrollments',
          action: 'update',
          payload: {
            status: 'withdrawn',
            end_date: '2026-05-13',
            withdrawal_reason: '퇴원',
            updated_at: '2026-05-13T10:00:00.000Z',
          },
        }),
        expect.objectContaining({
          table: 'student_schedules',
          action: 'update',
          payload: {
            active: false,
            updated_at: '2026-05-13T10:00:00.000Z',
          },
        }),
        expect.objectContaining({
          table: 'student_todos',
          action: 'update',
          payload: {
            deleted_at: '2026-05-13T10:00:00.000Z',
            updated_at: '2026-05-13T10:00:00.000Z',
          },
        }),
        expect.objectContaining({
          table: 'student_guardians',
          action: 'delete',
        }),
      ])
    )

    const enrollmentUpdate = supabase.calls.find(
      (call) => call.table === 'class_enrollments' && call.action === 'update'
    )

    expect(enrollmentUpdate?.filters).toEqual(
      expect.arrayContaining([
        ['eq', 'tenant_id', 'tenant-1'],
        ['in', 'student_id', ['student-1', 'student-2']],
        ['eq', 'status', 'active'],
      ])
    )
  })

  it('does nothing when no student ids are provided', async () => {
    const supabase = createSupabaseMock()

    const result = await detachStudentActiveRelations(supabase, {
      tenantId: 'tenant-1',
      studentIds: [],
    })

    expect(result).toEqual({ classIds: [] })
    expect(supabase.calls).toEqual([])
  })
})
