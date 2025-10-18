/**
 * Score Value Object
 * 점수 (맞은 문항 수 / 전체 문항 수) 관리
 */

export class Score {
  private constructor(
    private readonly correct: number,
    private readonly total: number
  ) {
    if (total <= 0) {
      throw new Error('전체 문항 수는 0보다 커야 합니다')
    }
    if (correct < 0) {
      throw new Error('맞은 문항 수는 0 이상이어야 합니다')
    }
    if (correct > total) {
      throw new Error('맞은 문항 수는 전체 문항 수를 초과할 수 없습니다')
    }
  }

  /**
   * 점수 생성
   */
  static create(correct: number, total: number): Score {
    return new Score(correct, total)
  }

  /**
   * 문자열에서 점수 파싱 (예: "30/32", "30")
   */
  static fromString(input: string, defaultTotal?: number): Score {
    const match = input.match(/^\s*(\d+)\s*(?:\/\s*(\d+))?\s*$/)

    if (!match) {
      throw new Error('올바른 점수 형식이 아닙니다 (예: "30/32" 또는 "30")')
    }

    const correct = parseInt(match[1])
    const total = match[2] ? parseInt(match[2]) : (defaultTotal || 100)

    return new Score(correct, total)
  }

  /**
   * 맞은 문항 수
   */
  getCorrect(): number {
    return this.correct
  }

  /**
   * 전체 문항 수
   */
  getTotal(): number {
    return this.total
  }

  /**
   * 득점률 계산 (백분율, 소수점 둘째자리)
   */
  getPercentage(): number {
    return Math.round((this.correct / this.total) * 100 * 100) / 100
  }

  /**
   * 득점률 계산 (정수)
   */
  getPercentageInt(): number {
    return Math.round((this.correct / this.total) * 100)
  }

  /**
   * 합격 여부 (70점 기준)
   */
  isPassed(threshold: number = 70): boolean {
    return this.getPercentageInt() >= threshold
  }

  /**
   * 등급 계산
   */
  getGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const percentage = this.getPercentageInt()

    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  /**
   * 분수 형식으로 변환 (예: "30/32")
   */
  toFractionString(): string {
    return `${this.correct}/${this.total}`
  }

  /**
   * 퍼센트 문자열 (예: "93.75%")
   */
  toPercentageString(): string {
    return `${this.getPercentage()}%`
  }

  /**
   * 동등성 비교
   */
  equals(other: Score): boolean {
    return this.correct === other.correct && this.total === other.total
  }
}
