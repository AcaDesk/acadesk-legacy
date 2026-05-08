import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/verify-permission', () => ({
  verifyStaff: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStudents } from './queries'

function makeChainable(resolveWith: unknown) {
  const promise = Promise.resolve(resolveWith)

  function createProxy(): Record<string, unknown> {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop: string) {
        if (prop === 'then') return promise.then.bind(promise)
        if (prop === 'catch') return promise.catch.bind(promise)
        if (prop === 'finally') return promise.finally.bind(promise)

        return () => createProxy()
      },
    })
  }

  return createProxy()
}

describe('getStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('falls back to the standard query when the search RPC fails', async () => {
    ;(verifyStaff as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenantId: 'tenant-uuid-001',
    })

    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Could not find the function public.search_students_list' },
    })

    const from = vi.fn((table: string) => {
      if (table === 'users') {
        return makeChainable({
          data: [{ id: 'user-uuid-001' }],
          error: null,
        })
      }

      if (table === 'students') {
        return makeChainable({
          data: [
            {
              id: 'student-uuid-001',
              student_code: 'S001',
              grade: '중1',
              school: '테스트중',
              enrollment_date: '2026-03-01',
              birth_date: null,
              student_phone: '010-1111-2222',
              profile_image_url: null,
              commute_method: null,
              marketing_source: null,
              users: {
                name: '홍길동',
                email: null,
                phone: '010-3333-4444',
              },
              class_enrollments: [],
              student_guardians: [],
            },
          ],
          error: null,
          count: 1,
        })
      }

      if (table === 'attendance') {
        return makeChainable({
          data: [],
          error: null,
        })
      }

      return makeChainable({
        data: [],
        error: null,
      })
    })

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      rpc,
      from,
    })

    const result = await getStudents({
      search: '홍길동',
      page: 1,
      pageSize: 20,
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toMatchObject({
      id: 'student-uuid-001',
      name: '홍길동',
    })
    expect(result.totalCount).toBe(1)
    expect(rpc).toHaveBeenCalledWith('search_students_list', expect.objectContaining({
      p_search: '홍길동',
    }))
    expect(from).toHaveBeenCalledWith('students')
  })
})
