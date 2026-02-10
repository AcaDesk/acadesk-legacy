import { describe, it, expect } from 'vitest'

/**
 * fetchStats 내부 날짜 계산 로직을 재현하여 테스트.
 * dashboard.ts에서 추출한 동일한 로직을 사용합니다.
 */
function computeDateBoundaries(today: string) {
  const [todayYear, todayMonth] = today.split('-').map(Number)
  const prevMonth = todayMonth === 1 ? 12 : todayMonth - 1
  const prevYear = todayMonth === 1 ? todayYear - 1 : todayYear
  const lastMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const currentMonthStart = `${todayYear}-${String(todayMonth).padStart(2, '0')}-01`
  const todayDateKST = new Date(today + 'T00:00:00+09:00')
  const weekAgo = new Date(todayDateKST)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const lastWeekStart = weekAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const thirtyDaysAgo = new Date(todayDateKST)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  return { lastMonthStart, currentMonthStart, lastWeekStart, thirtyDaysAgoISO }
}

// ============================================================================
// 기본 월 경계 계산
// ============================================================================
describe('월 경계 날짜 계산', () => {
  it('2월 중순 → 1월이 이전달', () => {
    const result = computeDateBoundaries('2026-02-15')
    expect(result.lastMonthStart).toBe('2026-01-01')
    expect(result.currentMonthStart).toBe('2026-02-01')
  })

  it('1월 → 이전달은 작년 12월', () => {
    const result = computeDateBoundaries('2026-01-05')
    expect(result.lastMonthStart).toBe('2025-12-01')
    expect(result.currentMonthStart).toBe('2026-01-01')
  })

  it('12월 → 이전달은 11월 (같은 해)', () => {
    const result = computeDateBoundaries('2026-12-20')
    expect(result.lastMonthStart).toBe('2026-11-01')
    expect(result.currentMonthStart).toBe('2026-12-01')
  })

  it('월초 1일에도 올바르게 계산', () => {
    const result = computeDateBoundaries('2026-03-01')
    expect(result.lastMonthStart).toBe('2026-02-01')
    expect(result.currentMonthStart).toBe('2026-03-01')
  })

  it('월말 마지막 날에도 올바르게 계산', () => {
    const result = computeDateBoundaries('2026-01-31')
    expect(result.lastMonthStart).toBe('2025-12-01')
    expect(result.currentMonthStart).toBe('2026-01-01')
  })
})

// ============================================================================
// KST 자정 전후 시나리오 (핵심 엣지 케이스)
// ============================================================================
describe('KST 자정 전후 경계', () => {
  it('KST 2026-02-01 00:00 = UTC 2026-01-31 15:00 → today가 2월이면 이전달은 1월', () => {
    // getTodayKST()는 KST 기준으로 '2026-02-01' 반환
    const result = computeDateBoundaries('2026-02-01')
    expect(result.lastMonthStart).toBe('2026-01-01')
    expect(result.currentMonthStart).toBe('2026-02-01')
  })

  it('KST 2026-01-01 00:00 = UTC 2025-12-31 15:00 → today가 1월이면 이전달은 작년 12월', () => {
    const result = computeDateBoundaries('2026-01-01')
    expect(result.lastMonthStart).toBe('2025-12-01')
    expect(result.currentMonthStart).toBe('2026-01-01')
  })

  it('previousMonth 쿼리 범위: gte(lastMonthStart) + lt(currentMonthStart)로 정확한 1달 커버', () => {
    const result = computeDateBoundaries('2026-03-15')
    // 쿼리: created_at >= '2026-02-01' AND created_at < '2026-03-01'
    // → 2월 전체를 포함 (2/28 23:59:59.999도 포함)
    expect(result.lastMonthStart).toBe('2026-02-01')
    expect(result.currentMonthStart).toBe('2026-03-01')
  })
})

// ============================================================================
// 주간/30일 계산
// ============================================================================
describe('주간 및 30일 계산', () => {
  it('lastWeekStart는 7일 전 KST 날짜', () => {
    const result = computeDateBoundaries('2026-02-15')
    expect(result.lastWeekStart).toBe('2026-02-08')
  })

  it('월초 7일 전은 이전달로 넘어감', () => {
    const result = computeDateBoundaries('2026-02-03')
    expect(result.lastWeekStart).toBe('2026-01-27')
  })

  it('연초 7일 전은 작년으로 넘어감', () => {
    const result = computeDateBoundaries('2026-01-03')
    expect(result.lastWeekStart).toBe('2025-12-27')
  })

  it('thirtyDaysAgoISO는 KST 기준 30일 전의 ISO 문자열', () => {
    const result = computeDateBoundaries('2026-02-15')
    // 2026-02-15 KST 00:00 → 2026-02-14T15:00:00.000Z
    // 30일 전 → 2026-01-15T15:00:00.000Z (= KST 2026-01-16 00:00)
    const thirtyDaysAgoDate = new Date(result.thirtyDaysAgoISO)
    const expectedDate = new Date('2026-01-16T00:00:00+09:00')
    expect(thirtyDaysAgoDate.getTime()).toBe(expectedDate.getTime())
  })

  it('3월에서 30일 전은 윤년도 고려됨', () => {
    const result = computeDateBoundaries('2026-03-15')
    // 2026-03-15 KST 00:00 → 2026-03-14T15:00:00.000Z
    // 30일 전 → 2026-02-12T15:00:00.000Z (= KST 2026-02-13 00:00)
    // 2026년은 윤년 아님 (2월 28일까지)
    const thirtyDaysAgoDate = new Date(result.thirtyDaysAgoISO)
    const expectedDate = new Date('2026-02-13T00:00:00+09:00')
    expect(thirtyDaysAgoDate.getTime()).toBe(expectedDate.getTime())
  })
})

// ============================================================================
// 기존 UTC 방식과의 비교 (회귀 검증)
// ============================================================================
describe('UTC 방식 vs KST 방식 비교', () => {
  it('KST 자정 직후(UTC 전날)에 UTC 방식은 잘못된 월을 반환한다', () => {
    // 시나리오: KST 2026-02-01 00:30 = UTC 2026-01-31 15:30
    // getTodayKST() → '2026-02-01'
    // 기존 UTC 방식: new Date() 시점이 UTC 1월 → getMonth() = 0 → 이전달 = 12월(!)
    // KST 방식: today 파싱 → 2월 → 이전달 = 1월 ✓

    const kstResult = computeDateBoundaries('2026-02-01')
    expect(kstResult.lastMonthStart).toBe('2026-01-01') // ✓ 올바름

    // 기존 UTC 방식 시뮬레이션 (서버가 UTC일 때)
    const utcNow = new Date('2026-01-31T15:30:00Z') // KST 2026-02-01 00:30
    const utcLastMonthStart = new Date(
      utcNow.getFullYear(), utcNow.getMonth() - 1, 1
    ).toISOString().split('T')[0]
    expect(utcLastMonthStart).toBe('2025-12-01') // ✗ 12월로 잘못 계산됨!
  })
})
