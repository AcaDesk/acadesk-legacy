/**
 * AttendanceStatus Value Object
 * 출석 상태 관리
 */

export type AttendanceStatusType = 'present' | 'late' | 'absent' | 'excused'

export class AttendanceStatus {
  private static readonly VALID_STATUSES: AttendanceStatusType[] = [
    'present',
    'late',
    'absent',
    'excused',
  ]

  private constructor(private readonly value: AttendanceStatusType) {}

  /**
   * Create AttendanceStatus
   */
  static create(status: string): AttendanceStatus {
    if (!AttendanceStatus.isValid(status)) {
      throw new Error(`유효하지 않은 출석 상태입니다: ${status}`)
    }

    return new AttendanceStatus(status as AttendanceStatusType)
  }

  /**
   * Validate status
   */
  static isValid(status: string): boolean {
    return AttendanceStatus.VALID_STATUSES.includes(status as AttendanceStatusType)
  }

  /**
   * Get status value
   */
  getValue(): AttendanceStatusType {
    return this.value
  }

  /**
   * Check if present
   */
  isPresent(): boolean {
    return this.value === 'present'
  }

  /**
   * Check if late
   */
  isLate(): boolean {
    return this.value === 'late'
  }

  /**
   * Check if absent
   */
  isAbsent(): boolean {
    return this.value === 'absent'
  }

  /**
   * Check if excused
   */
  isExcused(): boolean {
    return this.value === 'excused'
  }

  /**
   * Check if attended (present or late)
   */
  isAttended(): boolean {
    return this.isPresent() || this.isLate()
  }

  /**
   * Check if requires check-in time
   */
  requiresCheckIn(): boolean {
    return this.isPresent() || this.isLate()
  }

  /**
   * Get Korean label
   */
  getLabel(): string {
    const labels: Record<AttendanceStatusType, string> = {
      present: '출석',
      late: '지각',
      absent: '결석',
      excused: '결석 (사유)',
    }

    return labels[this.value]
  }

  /**
   * Get color code for UI
   */
  getColorCode(): string {
    const colors: Record<AttendanceStatusType, string> = {
      present: 'green',
      late: 'yellow',
      absent: 'red',
      excused: 'gray',
    }

    return colors[this.value]
  }

  /**
   * Compare with another AttendanceStatus
   */
  equals(other: AttendanceStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
