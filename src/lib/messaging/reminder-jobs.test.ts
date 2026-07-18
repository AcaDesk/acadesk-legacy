import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/messaging/event-alimtalk', () => ({
  fireEventAlimtalk: vi.fn().mockResolvedValue(undefined),
}))

import { runDailyReminders } from './reminder-jobs'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { fireEventAlimtalk } from '@/lib/messaging/event-alimtalk'

/** Supabase fluent chain mock — await 시 resolveWith 반환 */
function makeChainable(resolveWith: unknown) {
  const promise = Promise.resolve(resolveWith)
  function createProxy(): Record<string, unknown> {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop: string) {
        if (prop === 'then') return promise.then.bind(promise)
        if (prop === 'catch') return promise.catch.bind(promise)
        if (prop === 'finally') return promise.finally.bind(promise)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (..._args: unknown[]) => createProxy()
      },
    })
  }
  return createProxy()
}

const ok = (data: unknown) => makeChainable({ data, error: null })

const TENANT_A = 'tenant-a'
const HOMEWORK_TASK = {
  id: 'task-1',
  tenant_id: TENANT_A,
  student_id: 'student-1',
  title: '수학 익힘책 3단원',
  subject: '수학',
  due_date: '2026-07-18',
}
const LENDING = {
  id: 'lending-1',
  tenant_id: TENANT_A,
  student_id: 'student-2',
  due_date: '2026-07-18',
  textbooks: { title: '해리포터' },
}

describe('runDailyReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // KST 2026-07-17 10:00 → 내일 = 2026-07-18
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('구독 활성 테넌트가 없으면 알림 조회/발송 없이 연체 전환만 수행한다', async () => {
    const fromCalls: string[] = []
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        fromCalls.push(table)
        return ok([])
      },
    })

    const result = await runDailyReminders()

    expect(result).toEqual({
      homeworkDeadline: 0,
      bookLendingReminder: 0,
      invoicesMarkedOverdue: 0,
      paymentOverdueNotices: 0,
    })
    // 연체 상태 전환(tuition_invoices)은 도메인 로직이라 구독과 무관하게 수행됨
    expect(fromCalls).toEqual(['tenant_event_subscriptions', 'tuition_invoices'])
    expect(fireEventAlimtalk).not.toHaveBeenCalled()
  })

  it('숙제 마감 D-1: claim 후 학생별 발송, 변수 매핑 확인', async () => {
    const updateSpy = vi.fn(() => makeChainable({ data: null, error: null }))
    // select 체인은 await 시 태스크 목록을 반환, update는 updateSpy 경유
    const tasksChain = (() => {
      const promise = Promise.resolve({ data: [HOMEWORK_TASK], error: null })
      function proxy(): Record<string, unknown> {
        return new Proxy({} as Record<string, unknown>, {
          get(_, prop: string) {
            if (prop === 'then') return promise.then.bind(promise)
            if (prop === 'update') return updateSpy
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return (..._args: unknown[]) => proxy()
          },
        })
      }
      return proxy()
    })()
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'tenant_event_subscriptions')
          return ok([{ tenant_id: TENANT_A, event_type: 'homework_deadline' }])
        if (table === 'student_tasks') return tasksChain
        return ok([])
      },
    })

    const result = await runDailyReminders()

    expect(result.homeworkDeadline).toBe(1)
    expect(updateSpy).toHaveBeenCalledTimes(1) // claim (중복 발송 방지)
    expect(fireEventAlimtalk).toHaveBeenCalledWith(TENANT_A, 'homework_deadline', 'student-1', {
      과목명: '수학',
      숙제명: '수학 익힘책 3단원',
      마감일: '2026년 7월 18일',
    })
  })

  it('도서 반납 D-1: textbook 제목 매핑 + 발송', async () => {
    const updateSpy = vi.fn(() => makeChainable({ data: null, error: null }))
    const lendingsChain = (() => {
      const promise = Promise.resolve({ data: [LENDING], error: null })
      function proxy(): Record<string, unknown> {
        return new Proxy({} as Record<string, unknown>, {
          get(_, prop: string) {
            if (prop === 'then') return promise.then.bind(promise)
            if (prop === 'update') return updateSpy
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return (..._args: unknown[]) => proxy()
          },
        })
      }
      return proxy()
    })()
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'tenant_event_subscriptions')
          return ok([{ tenant_id: TENANT_A, event_type: 'book_lending_reminder' }])
        if (table === 'book_lendings') return lendingsChain
        return ok([])
      },
    })

    const result = await runDailyReminders()

    expect(result.bookLendingReminder).toBe(1)
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(fireEventAlimtalk).toHaveBeenCalledWith(TENANT_A, 'book_lending_reminder', 'student-2', {
      도서명: '해리포터',
      반납일: '2026년 7월 18일',
    })
  })
})
