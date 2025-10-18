/**
 * SessionStatus Value Object
 * 출석 세션 상태 관리
 */

export type SessionStatusType = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export class SessionStatus {
  private static readonly VALID_STATUSES: SessionStatusType[] = [
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
  ]

  private constructor(private readonly value: SessionStatusType) {}

  /**
   * Create SessionStatus
   */
  static create(status: string): SessionStatus {
    if (!SessionStatus.isValid(status)) {
      throw new Error(`유효하지 않은 세션 상태입니다: ${status}`)
    }

    return new SessionStatus(status as SessionStatusType)
  }

  /**
   * Create default status (scheduled)
   */
  static createDefault(): SessionStatus {
    return new SessionStatus('scheduled')
  }

  /**
   * Validate status
   */
  static isValid(status: string): boolean {
    return SessionStatus.VALID_STATUSES.includes(status as SessionStatusType)
  }

  /**
   * Get status value
   */
  getValue(): SessionStatusType {
    return this.value
  }

  /**
   * Check if scheduled
   */
  isScheduled(): boolean {
    return this.value === 'scheduled'
  }

  /**
   * Check if in progress
   */
  isInProgress(): boolean {
    return this.value === 'in_progress'
  }

  /**
   * Check if completed
   */
  isCompleted(): boolean {
    return this.value === 'completed'
  }

  /**
   * Check if cancelled
   */
  isCancelled(): boolean {
    return this.value === 'cancelled'
  }

  /**
   * Check if active (scheduled or in_progress)
   */
  isActive(): boolean {
    return this.isScheduled() || this.isInProgress()
  }

  /**
   * Check if can start
   */
  canStart(): boolean {
    return this.isScheduled()
  }

  /**
   * Check if can complete
   */
  canComplete(): boolean {
    return this.isInProgress()
  }

  /**
   * Check if can cancel
   */
  canCancel(): boolean {
    return !this.isCompleted()
  }

  /**
   * Get Korean label
   */
  getLabel(): string {
    const labels: Record<SessionStatusType, string> = {
      scheduled: '예정',
      in_progress: '진행 중',
      completed: '완료',
      cancelled: '취소',
    }

    return labels[this.value]
  }

  /**
   * Get color code for UI
   */
  getColorCode(): string {
    const colors: Record<SessionStatusType, string> = {
      scheduled: 'blue',
      in_progress: 'green',
      completed: 'gray',
      cancelled: 'red',
    }

    return colors[this.value]
  }

  /**
   * Get next status
   */
  getNextStatus(): SessionStatus | null {
    const transitions: Record<SessionStatusType, SessionStatusType | null> = {
      scheduled: 'in_progress',
      in_progress: 'completed',
      completed: null,
      cancelled: null,
    }

    const nextStatus = transitions[this.value]
    return nextStatus ? new SessionStatus(nextStatus) : null
  }

  /**
   * Compare with another SessionStatus
   */
  equals(other: SessionStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
