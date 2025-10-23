/**
 * Email Value Object
 * 이메일 검증 및 정규화
 */

export class Email {
  private constructor(private readonly value: string) {}

  /**
   * Create Email from string with validation
   */
  static create(email: string): Email {
    const normalized = email.trim().toLowerCase()

    if (!Email.isValid(normalized)) {
      throw new Error('유효하지 않은 이메일 형식입니다.')
    }

    return new Email(normalized)
  }

  /**
   * Validate email format
   */
  static isValid(email: string): boolean {
    if (!email || email.length === 0) {
      return false
    }

    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get email value
   */
  getValue(): string {
    return this.value
  }

  /**
   * Get domain part of email
   */
  getDomain(): string {
    return this.value.split('@')[1]
  }

  /**
   * Get local part of email
   */
  getLocalPart(): string {
    return this.value.split('@')[0]
  }

  /**
   * Check if email is from specific domain
   */
  isFromDomain(domain: string): boolean {
    return this.getDomain().toLowerCase() === domain.toLowerCase()
  }

  /**
   * Check if email is from common free email providers
   */
  isFreeEmail(): boolean {
    const freeProviders = [
      'gmail.com',
      'naver.com',
      'daum.net',
      'kakao.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
    ]

    return freeProviders.some((provider) => this.isFromDomain(provider))
  }

  /**
   * Mask email for privacy (e.g., u***@example.com)
   */
  mask(): string {
    const [local, domain] = this.value.split('@')

    if (local.length <= 2) {
      return `${local[0]}***@${domain}`
    }

    const visiblePart = local.substring(0, 2)
    return `${visiblePart}***@${domain}`
  }

  /**
   * Compare with another Email
   */
  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
