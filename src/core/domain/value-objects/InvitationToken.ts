/**
 * InvitationToken Value Object
 * 초대 토큰 생성 및 검증
 */

import { randomBytes } from 'crypto'

export class InvitationToken {
  private static readonly TOKEN_LENGTH = 32 // 32 bytes = 256 bits
  private static readonly TOKEN_FORMAT = /^[a-f0-9]{64}$/ // hex string (64 chars for 32 bytes)

  private constructor(private readonly value: string) {}

  /**
   * Generate new random invitation token
   */
  static generate(): InvitationToken {
    // Use crypto.randomBytes for cryptographically secure random token
    const token = randomBytes(InvitationToken.TOKEN_LENGTH).toString('hex')
    return new InvitationToken(token)
  }

  /**
   * Create InvitationToken from existing string
   */
  static create(token: string): InvitationToken {
    const normalized = token.trim().toLowerCase()

    if (!InvitationToken.isValid(normalized)) {
      throw new Error('유효하지 않은 초대 토큰 형식입니다.')
    }

    return new InvitationToken(normalized)
  }

  /**
   * Validate token format
   */
  static isValid(token: string): boolean {
    if (!token || token.length === 0) {
      return false
    }

    return InvitationToken.TOKEN_FORMAT.test(token)
  }

  /**
   * Get token value
   */
  getValue(): string {
    return this.value
  }

  /**
   * Get masked token for display (shows first 8 and last 4 chars)
   * e.g., "abc12345...6789"
   */
  getMasked(): string {
    if (this.value.length < 16) {
      return '***'
    }

    const prefix = this.value.substring(0, 8)
    const suffix = this.value.substring(this.value.length - 4)
    return `${prefix}...${suffix}`
  }

  /**
   * Get token length
   */
  getLength(): number {
    return this.value.length
  }

  /**
   * Compare with another InvitationToken
   */
  equals(other: InvitationToken): boolean {
    return this.value === other.value
  }

  /**
   * Compare with string
   */
  equalsString(token: string): boolean {
    return this.value === token.trim().toLowerCase()
  }

  toString(): string {
    return this.value
  }

  /**
   * Generate short invitation code (8 characters, uppercase alphanumeric)
   * Use case: 사용자 친화적인 짧은 코드 (e.g., "ABC12345")
   */
  static generateShortCode(): InvitationToken {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid 0, O, 1, I for clarity
    let code = ''

    const bytes = randomBytes(8)
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length]
    }

    // Pad with zeros to meet format requirements (convert to hex-like format)
    const paddedCode = code.toLowerCase().padEnd(64, '0')
    return new InvitationToken(paddedCode)
  }

  /**
   * Get short code (first 8 characters, uppercase)
   */
  getShortCode(): string {
    return this.value.substring(0, 8).toUpperCase()
  }
}
