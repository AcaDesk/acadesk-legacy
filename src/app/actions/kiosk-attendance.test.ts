import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { lookupStudentsByPhone, recordKioskAttendance } from './kiosk-attendance'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ─── Mock 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * Supabase fluent chain mock
 * .eq(), .is(), .in(), .limit(), .maybeSingle(), .single(), .select(), .insert(), .upsert() 등
 * 모든 체인 메서드를 지원하며, await 시 resolveWith 값을 반환합니다.
 */
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
const err = (msg: string) => makeChainable({ data: null, error: { message: msg } })

// ─── 테스트 픽스처 ────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-001'
const STUDENT_ID = 'student-uuid-001'
const CLASS_ID = 'class-uuid-001'
const SESSION_ID = 'session-uuid-001'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TODAY = '2026-03-04'

/** 정상 보호자 연결 학생 (하이픈 형식) */
const studentHyphenPhone = {
  id: STUDENT_ID,
  name: '홍길동',
  grade: '중2',
  student_guardians: [{ guardians: { users: { phone: '010-1234-5678' } } }],
}

/** 정상 보호자 연결 학생 (하이픈 없는 형식) */
const studentRawPhone = {
  id: 'student-uuid-002',
  name: '김철수',
  grade: '중1',
  student_guardians: [{ guardians: { users: { phone: '01012345678' } } }],
}

/** 보호자 미등록 학생 */
const studentNoGuardian = {
  id: 'student-uuid-003',
  name: '이영희',
  grade: '중3',
  student_guardians: [],
}

/** 보호자 등록됐으나 전화번호 없음 */
const studentNoPhone = {
  id: 'student-uuid-004',
  name: '박민준',
  grade: '초6',
  student_guardians: [{ guardians: { users: { phone: null } } }],
}

/** 형제: 같은 전화번호 */
const sibling = {
  id: 'student-uuid-005',
  name: '홍길순',
  grade: '초6',
  student_guardians: [{ guardians: { users: { phone: '010-1234-5678' } } }],
}

// ─── lookupStudentsByPhone ────────────────────────────────────────────────────

describe('lookupStudentsByPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-04T10:00:00.000Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── 정상 케이스 ─────────────────────────────────────────────────────────────

  it('1명 매칭 — 출석 기록 없으면 currentStatus: out', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone])
        if (table === 'attendance') return ok([]) // 오늘 출석 없음
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(true)
    expect(result.students).toHaveLength(1)
    expect(result.students![0]).toMatchObject({
      id: STUDENT_ID,
      name: '홍길동',
      currentStatus: 'out',
    })
  })

  it('1명 매칭 — check_in_at 있으면 currentStatus: in', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone])
        if (table === 'attendance')
          return ok([{ student_id: STUDENT_ID, check_in_at: '2026-03-04T09:00:00Z', check_out_at: null }])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(true)
    expect(result.students![0].currentStatus).toBe('in')
  })

  it('1명 매칭 — check_out_at 있으면 currentStatus: done', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone])
        if (table === 'attendance')
          return ok([{ student_id: STUDENT_ID, check_in_at: '2026-03-04T09:00:00Z', check_out_at: '2026-03-04T18:00:00Z' }])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.students![0].currentStatus).toBe('done')
  })

  // ── 전화번호 형식 ────────────────────────────────────────────────────────────

  it('하이픈 형식 전화번호 (010-1234-5678) — 정상 매칭', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone])
        if (table === 'attendance') return ok([])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')
    expect(result.success).toBe(true)
    expect(result.students).toHaveLength(1)
  })

  it('하이픈 없는 형식 (01012345678) — 정상 매칭', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentRawPhone])
        if (table === 'attendance') return ok([])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')
    expect(result.success).toBe(true)
    expect(result.students).toHaveLength(1)
  })

  // ── 형제자매 ─────────────────────────────────────────────────────────────────

  it('형제자매 — 같은 전화번호로 2명 매칭 시 students 배열 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone, sibling])
        if (table === 'attendance') return ok([])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(true)
    expect(result.students).toHaveLength(2)
    expect(result.students!.map((s) => s.name)).toEqual(['홍길동', '홍길순'])
  })

  it('형제자매 — 각자의 출석 상태를 독립적으로 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone, sibling])
        if (table === 'attendance')
          return ok([
            // 형은 등원 완료
            { student_id: STUDENT_ID, check_in_at: '2026-03-04T09:00:00Z', check_out_at: null },
            // 동생은 아직 미등원
          ])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(true)
    const 홍길동 = result.students!.find((s) => s.name === '홍길동')
    const 홍길순 = result.students!.find((s) => s.name === '홍길순')
    expect(홍길동!.currentStatus).toBe('in')
    expect(홍길순!.currentStatus).toBe('out')
  })

  // ── 보호자 미등록 / 전화번호 없음 ────────────────────────────────────────────

  it('보호자 미등록 학생만 있을 때 — 일치하는 학생 없음 에러', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentNoGuardian])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(false)
    expect(result.error).toContain('일치하는 학생이 없습니다')
  })

  it('보호자 있지만 전화번호 null — 일치하는 학생 없음 에러', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentNoPhone])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(false)
    expect(result.error).toContain('일치하는 학생이 없습니다')
  })

  it('보호자 미등록 학생과 정상 학생 혼재 — 정상 학생만 매칭', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentNoGuardian, studentHyphenPhone])
        if (table === 'attendance') return ok([])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(true)
    expect(result.students).toHaveLength(1)
    expect(result.students![0].name).toBe('홍길동')
  })

  // ── 에러 케이스 ─────────────────────────────────────────────────────────────

  it('뒷자리가 일치하는 학생 없음 — 에러 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([studentHyphenPhone])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '9999')

    expect(result.success).toBe(false)
    expect(result.error).toContain('일치하는 학생이 없습니다')
  })

  it('등록된 학생이 없음 (빈 배열) — 에러 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'students') return ok([])
        return ok(null)
      },
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(false)
    expect(result.error).toBe('등록된 학생이 없습니다.')
  })

  it('DB 에러 발생 시 — success: false 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: () => err('DB connection failed'),
    })

    const result = await lookupStudentsByPhone(TENANT_ID, '5678')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─── recordKioskAttendance ────────────────────────────────────────────────────

describe('recordKioskAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-04T10:00:00.000Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── 클래스 배정 학생 (정상 케이스) ──────────────────────────────────────────

  it('check_in — 클래스 배정 + 기존 세션 있음', async () => {
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments')
          return ok({ class_id: CLASS_ID })
        if (table === 'attendance_sessions')
          return ok({ id: SESSION_ID })
        if (table === 'attendance')
          return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(true)
    const upsertArg = upsertMock.mock.calls[0][0]
    expect(upsertArg).toMatchObject({
      student_id: STUDENT_ID,
      session_id: SESSION_ID,
      status: 'present',
    })
    expect(upsertArg.check_in_at).toBeDefined()
    expect(upsertArg.check_out_at).toBeUndefined()
  })

  it('check_out — check_out_at만 포함, check_in_at 없음', async () => {
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok({ class_id: CLASS_ID })
        if (table === 'attendance_sessions') return ok({ id: SESSION_ID })
        if (table === 'attendance') return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_out')

    expect(result.success).toBe(true)
    const upsertArg = upsertMock.mock.calls[0][0]
    expect(upsertArg.check_out_at).toBeDefined()
    expect(upsertArg.check_in_at).toBeUndefined()
  })

  // ── 클래스 미배정 학생 ───────────────────────────────────────────────────────

  it('클래스 미배정 — 기존 기본 클래스 사용', async () => {
    const DEFAULT_CLASS_ID = 'default-class-uuid'
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok(null) // 미배정
        if (table === 'classes') return ok([{ id: DEFAULT_CLASS_ID }]) // 기본 클래스 존재
        if (table === 'attendance_sessions') return ok({ id: SESSION_ID })
        if (table === 'attendance') return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(true)
    const upsertArg = upsertMock.mock.calls[0][0]
    expect(upsertArg.session_id).toBe(SESSION_ID)
  })

  it('클래스 미배정 + 기본 클래스 없음 — 기본 클래스 신규 생성', async () => {
    const NEW_CLASS_ID = 'new-default-class-uuid'
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))
    let classesCallCount = 0

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok(null)
        if (table === 'classes') {
          classesCallCount++
          if (classesCallCount === 1) return ok([]) // select: 기본 클래스 없음
          return ok({ id: NEW_CLASS_ID }) // insert: 새 클래스 생성
        }
        if (table === 'attendance_sessions') return ok({ id: SESSION_ID })
        if (table === 'attendance') return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(true)
    expect(classesCallCount).toBe(2) // select 1회 + insert 1회
  })

  // ── 세션 생성 ────────────────────────────────────────────────────────────────

  it('기존 세션 없음 — 세션 신규 생성', async () => {
    const NEW_SESSION_ID = 'new-session-uuid'
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))
    let sessionCallCount = 0

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok({ class_id: CLASS_ID })
        if (table === 'attendance_sessions') {
          sessionCallCount++
          if (sessionCallCount === 1) return ok(null) // maybeSingle: 세션 없음
          return ok({ id: NEW_SESSION_ID }) // insert: 세션 생성
        }
        if (table === 'attendance') return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(true)
    expect(sessionCallCount).toBe(2)
  })

  it('세션 생성 중 race condition (23505) — 재조회 후 성공', async () => {
    const RACE_SESSION_ID = 'race-session-uuid'
    const upsertMock = vi.fn().mockReturnValue(makeChainable({ error: null }))
    let sessionCallCount = 0

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok({ class_id: CLASS_ID })
        if (table === 'attendance_sessions') {
          sessionCallCount++
          if (sessionCallCount === 1) return ok(null) // maybeSingle: 세션 없음
          if (sessionCallCount === 2)
            // insert: 23505 race condition
            return makeChainable({ data: null, error: { code: '23505', message: 'duplicate key' } })
          // 재조회: 세션 반환
          return ok({ id: RACE_SESSION_ID })
        }
        if (table === 'attendance') return { upsert: upsertMock }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(true)
    expect(sessionCallCount).toBe(3) // 최초조회 + 생성시도(23505) + 재조회
  })

  // ── 에러 케이스 ─────────────────────────────────────────────────────────────

  it('upsert 에러 — success: false 반환', async () => {
    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok({ class_id: CLASS_ID })
        if (table === 'attendance_sessions') return ok({ id: SESSION_ID })
        if (table === 'attendance')
          return { upsert: () => makeChainable({ error: { message: 'upsert failed' } }) }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('클래스 insert 에러 — success: false 반환', async () => {
    let classesCallCount = 0

    ;(createServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === 'class_enrollments') return ok(null)
        if (table === 'classes') {
          classesCallCount++
          if (classesCallCount === 1) return ok([]) // select: 기본 클래스 없음
          return makeChainable({ data: null, error: { message: 'insert failed' } }) // insert 에러
        }
        return ok(null)
      },
    })

    const result = await recordKioskAttendance(STUDENT_ID, TENANT_ID, 'check_in')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
