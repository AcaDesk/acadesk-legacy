// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeStudentRisk, type AttendanceWindow } from './risk-score'

const window = (partial: Partial<AttendanceWindow> = {}): AttendanceWindow => ({
  present: 0,
  late: 0,
  absent: 0,
  total: 0,
  ...partial,
})

describe('computeStudentRisk', () => {
  it('신호가 없으면 null을 반환한다', () => {
    expect(computeStudentRisk({})).toBeNull()
  })

  it('정상 학생(높은 출석률, 성적 유지)은 null을 반환한다', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window({ present: 10, total: 10 }),
        prev: window({ present: 10, total: 10 }),
        hasAny: true,
        hasLast7d: true,
      },
      scores: { recent: [85, 90], prev: [88, 87] },
      pendingTodoCount: 1,
    })
    expect(result).toBeNull()
  })

  it('출석 기록이 전혀 없는 신규 학생은 플래그하지 않는다', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window(),
        prev: window(),
        hasAny: false,
        hasLast7d: false,
      },
    })
    expect(result).toBeNull()
  })

  it('다니던 학생의 7일 공백 + 낮은 출석률 → warning', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window({ present: 2, absent: 2, total: 4 }),
        prev: window({ present: 8, total: 8 }),
        hasAny: true,
        hasLast7d: false,
      },
    })
    // 7일 공백(+2) + 출석률 50%(+2) + 출석률 50%p 하락(+2) = 6 → danger
    expect(result).not.toBeNull()
    expect(result!.level).toBe('danger')
    expect(result!.reasons).toContain('최근 7일 출석 기록 없음')
  })

  it('성적 10점 이상 하락 + 미완료 과제 3개 → warning', () => {
    const result = computeStudentRisk({
      scores: { recent: [70, 72], prev: [85, 88] },
      pendingTodoCount: 3,
    })
    // 성적 하락(+2) + 과제(+1) = 3 → warning
    expect(result).not.toBeNull()
    expect(result!.level).toBe('warning')
    expect(result!.score).toBe(3)
    expect(result!.reasons.some((r) => r.includes('평균 성적'))).toBe(true)
    expect(result!.reasons).toContain('미완료 과제 3개')
  })

  it('복합 신호 누적 시 danger로 승격된다', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window({ present: 3, absent: 3, total: 6 }),
        prev: window({ present: 8, total: 8 }),
        hasAny: true,
        hasLast7d: true,
      },
      scores: { recent: [50, 55], prev: [75, 80] },
      pendingTodoCount: 7,
    })
    expect(result).not.toBeNull()
    expect(result!.level).toBe('danger')
    // 출석률 50%(+2) + 50%p 하락(+2) + 결석 3회(+1) + 성적 하락(+2) + 평균 60 미만(+1) + 과제 6개+(+2)
    expect(result!.score).toBe(10)
  })

  it('표본이 적으면(출석 3회 미만, 시험 2회 미만) 해당 신호를 무시한다', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window({ absent: 2, total: 2 }), // 출석률 0%지만 표본 2회
        prev: window({ present: 8, total: 8 }),
        hasAny: true,
        hasLast7d: true,
      },
      scores: { recent: [30], prev: [90] }, // 각 1회뿐
    })
    expect(result).toBeNull()
  })

  it('지각은 출석으로 간주해 출석률에 포함한다', () => {
    const result = computeStudentRisk({
      attendance: {
        recent: window({ present: 5, late: 5, total: 10 }), // (5+5)/10 = 100%
        prev: window({ present: 10, total: 10 }),
        hasAny: true,
        hasLast7d: true,
      },
    })
    expect(result).toBeNull()
  })
})
