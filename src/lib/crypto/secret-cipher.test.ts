import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import {
  EncryptionError,
  _resetKeyCache,
  decryptSecret,
  encryptSecret,
  isEncrypted,
  maskSecret,
} from './secret-cipher'

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY

function setKey(buffer: Buffer | null) {
  if (buffer === null) {
    delete process.env.ENCRYPTION_KEY
  } else {
    process.env.ENCRYPTION_KEY = buffer.toString('base64')
  }
  _resetKeyCache()
}

describe('secret-cipher', () => {
  beforeEach(() => {
    setKey(randomBytes(32))
  })

  afterEach(() => {
    if (ORIGINAL_KEY) {
      process.env.ENCRYPTION_KEY = ORIGINAL_KEY
    } else {
      delete process.env.ENCRYPTION_KEY
    }
    _resetKeyCache()
  })

  it('암호화 → 복호화 round-trip', () => {
    const plaintext = 'sk_live_abcdef1234567890'
    const encrypted = encryptSecret(plaintext)
    expect(isEncrypted(encrypted)).toBe(true)
    expect(encrypted).not.toContain(plaintext)
    expect(decryptSecret(encrypted)).toBe(plaintext)
  })

  it('동일한 평문도 매번 다른 암호문을 생성한다 (랜덤 IV)', () => {
    const plaintext = 'same-secret'
    const a = encryptSecret(plaintext)
    const b = encryptSecret(plaintext)
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe(plaintext)
    expect(decryptSecret(b)).toBe(plaintext)
  })

  it('prefix 없는 평문은 그대로 통과한다 (레거시 호환)', () => {
    expect(decryptSecret('plain-text-secret')).toBe('plain-text-secret')
    expect(isEncrypted('plain-text-secret')).toBe(false)
  })

  it('변조된 암호문은 EncryptionError를 던진다', () => {
    const encrypted = encryptSecret('orig')
    const tampered = encrypted.slice(0, -2) + 'AA'
    expect(() => decryptSecret(tampered)).toThrow(EncryptionError)
  })

  it('다른 키로 암호화된 값은 복호화 실패', () => {
    const encrypted = encryptSecret('orig')
    setKey(randomBytes(32))
    expect(() => decryptSecret(encrypted)).toThrow(EncryptionError)
  })

  it('ENCRYPTION_KEY 부재 시 EncryptionError', () => {
    setKey(null)
    expect(() => encryptSecret('x')).toThrow(EncryptionError)
  })

  it('ENCRYPTION_KEY 길이가 32바이트가 아니면 EncryptionError', () => {
    setKey(randomBytes(16))
    expect(() => encryptSecret('x')).toThrow(/32바이트/)
  })

  it('빈 문자열은 암호화 못 한다', () => {
    expect(() => encryptSecret('')).toThrow(EncryptionError)
  })

  it('maskSecret은 끝 4글자만 노출', () => {
    expect(maskSecret('sk_live_abcdef1234')).toBe('***1234')
    expect(maskSecret('abcd')).toBe('***')
    expect(maskSecret(null)).toBeNull()
    expect(maskSecret('')).toBeNull()
  })
})
