/**
 * Priority Value Object
 * TODO 우선순위를 표현하는 값 객체
 */

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent'

export class Priority {
  private readonly level: PriorityLevel

  private constructor(level: PriorityLevel) {
    this.level = level
  }

  static low(): Priority {
    return new Priority('low')
  }

  static normal(): Priority {
    return new Priority('normal')
  }

  static high(): Priority {
    return new Priority('high')
  }

  static urgent(): Priority {
    return new Priority('urgent')
  }

  static fromString(level: string): Priority {
    const validLevels: PriorityLevel[] = ['low', 'normal', 'high', 'urgent']
    if (!validLevels.includes(level as PriorityLevel)) {
      return Priority.normal()
    }
    return new Priority(level as PriorityLevel)
  }

  getValue(): PriorityLevel {
    return this.level
  }

  isHigherThan(other: Priority): boolean {
    const order: Record<PriorityLevel, number> = {
      low: 0,
      normal: 1,
      high: 2,
      urgent: 3,
    }
    return order[this.level] > order[other.level]
  }

  toString(): string {
    return this.level
  }

  toKorean(): string {
    const korean: Record<PriorityLevel, string> = {
      low: '낮음',
      normal: '보통',
      high: '높음',
      urgent: '긴급',
    }
    return korean[this.level]
  }
}
