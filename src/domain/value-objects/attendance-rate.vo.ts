/**
 * 출석률 Value Object
 * 0-100 사이의 출석률을 보장하고 상태 판단 로직 포함
 */
export class AttendanceRate {
  private constructor(private readonly value: number) {
    this.validate(value)
  }

  static create(value: number): AttendanceRate {
    return new AttendanceRate(value)
  }

  static fromPercentageString(percentage: string): AttendanceRate {
    const value = parseFloat(percentage.replace("%", ""))
    return new AttendanceRate(value)
  }

  private validate(value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Attendance rate must be a finite number, got: ${value}`
      )
    }
    if (value < 0 || value > 100) {
      throw new Error(`Attendance rate must be between 0 and 100, got: ${value}`)
    }
  }

  getValue(): number {
    return this.value
  }

  toPercentageString(): string {
    return `${this.value}%`
  }

  getStatus(): "good" | "warning" | "poor" {
    if (this.isGood()) return "good"
    if (this.isWarning()) return "warning"
    return "poor"
  }

  isGood(): boolean {
    return this.value >= 90
  }

  isWarning(): boolean {
    return this.value >= 70 && this.value < 90
  }

  isPoor(): boolean {
    return this.value < 70
  }

  equals(other: AttendanceRate): boolean {
    return this.value === other.value
  }
}
