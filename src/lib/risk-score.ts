/**
 * 위험 학생 조기 경보 — 규칙 기반 복합 스코어링 (순수 함수)
 *
 * 최근 28일 vs 이전 28일 신호를 합산해 위험도를 평가한다.
 * 점수 5+ → danger(위험), 3~4 → warning(주의), 그 미만 → null(정상).
 */

export interface AttendanceWindow {
  present: number
  late: number
  absent: number
  total: number
}

export interface RiskSignals {
  attendance?: {
    recent: AttendanceWindow
    prev: AttendanceWindow
    /** 조회 기간(56일) 내 출석 기록 존재 여부 */
    hasAny: boolean
    /** 최근 7일 내 출석 기록 존재 여부 */
    hasLast7d: boolean
  }
  scores?: {
    recent: number[]
    prev: number[]
  }
  pendingTodoCount?: number
}

export interface RiskAssessment {
  score: number
  level: 'danger' | 'warning'
  reasons: string[]
}

const DANGER_THRESHOLD = 5
const WARNING_THRESHOLD = 3

/** 최소 출석 기록 수 — 미만이면 출석률 신호를 판단하지 않음 */
const MIN_ATTENDANCE_RECORDS = 3
/** 최소 시험 응시 수 — 미만이면 성적 신호를 판단하지 않음 */
const MIN_SCORE_COUNT = 2

function attendanceRate(window: AttendanceWindow): number | null {
  if (window.total === 0) return null
  return Math.round(((window.present + window.late) / window.total) * 100)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function computeStudentRisk(signals: RiskSignals): RiskAssessment | null {
  let score = 0
  const reasons: string[] = []

  const att = signals.attendance

  // 다니던 학생이 최근 7일간 기록 없음 (기록이 전혀 없는 신규 학생은 제외)
  if (att && att.hasAny && !att.hasLast7d) {
    score += 2
    reasons.push('최근 7일 출석 기록 없음')
  }

  if (att && att.recent.total >= MIN_ATTENDANCE_RECORDS) {
    const recentRate = attendanceRate(att.recent)!
    if (recentRate < 70) {
      score += 2
      reasons.push(`출석률 ${recentRate}%`)
    }

    const prevRate =
      att.prev.total >= MIN_ATTENDANCE_RECORDS ? attendanceRate(att.prev) : null
    if (prevRate !== null && prevRate - recentRate >= 15) {
      score += 2
      reasons.push(`출석률 ${prevRate - recentRate}%p 하락`)
    }

    if (att.recent.absent >= 3) {
      score += 1
      reasons.push(`결석 ${att.recent.absent}회`)
    }
  }

  const sc = signals.scores
  const recentAvg =
    sc && sc.recent.length >= MIN_SCORE_COUNT ? average(sc.recent) : null
  if (recentAvg !== null) {
    const prevAvg = sc && sc.prev.length >= MIN_SCORE_COUNT ? average(sc.prev) : null
    if (prevAvg !== null && prevAvg - recentAvg >= 10) {
      score += 2
      reasons.push(`평균 성적 ${Math.round(prevAvg - recentAvg)}점 하락`)
    }
    if (recentAvg < 60) {
      score += 1
      reasons.push(`평균 ${Math.round(recentAvg)}점`)
    }
  }

  const pending = signals.pendingTodoCount ?? 0
  if (pending >= 3) {
    score += pending >= 6 ? 2 : 1
    reasons.push(`미완료 과제 ${pending}개`)
  }

  if (score < WARNING_THRESHOLD) return null

  return {
    score,
    level: score >= DANGER_THRESHOLD ? 'danger' : 'warning',
    reasons,
  }
}
