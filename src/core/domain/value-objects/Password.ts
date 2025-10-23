/**
 * Password Value Object
 * 비밀번호 강도 검증 및 보안 규칙 관리
 */

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: PasswordStrength
}

export class Password {
  private static readonly MIN_LENGTH = 6
  private static readonly RECOMMENDED_LENGTH = 8
  private static readonly STRONG_LENGTH = 12

  private constructor(private readonly value: string) {}

  /**
   * Create Password with validation
   */
  static create(password: string): Password {
    const validation = Password.validate(password)

    if (!validation.isValid) {
      throw new Error(validation.errors[0] || '유효하지 않은 비밀번호입니다.')
    }

    return new Password(password)
  }

  /**
   * Create Password without validation (for existing passwords)
   * Use case: 데이터베이스에서 읽어온 이미 검증된 비밀번호
   */
  static createUnsafe(password: string): Password {
    return new Password(password)
  }

  /**
   * Validate password with detailed feedback
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = []

    // Check minimum length
    if (!password || password.length < Password.MIN_LENGTH) {
      errors.push(`비밀번호는 최소 ${Password.MIN_LENGTH}자 이상이어야 합니다.`)
    }

    // Check maximum length (prevent DoS)
    if (password.length > 128) {
      errors.push('비밀번호는 128자를 초과할 수 없습니다.')
    }

    // Check for common weak passwords
    if (Password.isCommonPassword(password)) {
      errors.push('너무 흔한 비밀번호입니다. 더 안전한 비밀번호를 사용해주세요.')
    }

    const strength = Password.calculateStrength(password)

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    }
  }

  /**
   * Calculate password strength
   */
  private static calculateStrength(password: string): PasswordStrength {
    let score = 0

    // Length score
    if (password.length >= Password.STRONG_LENGTH) {
      score += 2
    } else if (password.length >= Password.RECOMMENDED_LENGTH) {
      score += 1
    }

    // Complexity score
    if (/[a-z]/.test(password)) score += 1 // lowercase
    if (/[A-Z]/.test(password)) score += 1 // uppercase
    if (/[0-9]/.test(password)) score += 1 // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1 // special chars

    if (score >= 5) return 'strong'
    if (score >= 3) return 'medium'
    return 'weak'
  }

  /**
   * Check if password is commonly used
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456',
      'password',
      '12345678',
      'qwerty',
      '123456789',
      '12345',
      '1234',
      '111111',
      '1234567',
      'dragon',
      '123123',
      'baseball',
      'iloveyou',
      'trustno1',
      '1234567890',
      'password1',
      'qwerty123',
    ]

    return commonPasswords.includes(password.toLowerCase())
  }

  /**
   * Get password value (use carefully, mainly for hashing)
   */
  getValue(): string {
    return this.value
  }

  /**
   * Get password strength
   */
  getStrength(): PasswordStrength {
    return Password.calculateStrength(this.value)
  }

  /**
   * Check if password is strong enough
   */
  isStrong(): boolean {
    return this.getStrength() === 'strong'
  }

  /**
   * Check if password meets minimum requirements
   */
  isValid(): boolean {
    const validation = Password.validate(this.value)
    return validation.isValid
  }

  /**
   * Get password length
   */
  getLength(): number {
    return this.value.length
  }

  /**
   * Check if two passwords match
   */
  matches(other: Password): boolean {
    return this.value === other.value
  }

  /**
   * Check if string matches this password
   */
  matchesString(plaintext: string): boolean {
    return this.value === plaintext
  }
}
