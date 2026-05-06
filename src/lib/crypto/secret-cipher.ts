/**
 * Secret Cipher — AES-256-GCM 기반 외부 API 시크릿 암호화 유틸
 *
 * - 학원별 Solapi/NHN/Aligo API Secret을 DB에 평문으로 저장하지 않기 위함
 * - payload 포맷: `v1:<base64(iv(12) || ciphertext || authTag(16))>`
 * - 키 소스: `process.env.ENCRYPTION_KEY` — base64 인코딩된 32바이트
 * - 레거시 호환: prefix 없는 문자열은 평문으로 간주 (마이그레이션 lazy)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION_PREFIX = 'v1:'
const IV_LENGTH = 12 // GCM 권장 12바이트
const AUTH_TAG_LENGTH = 16
const ALGO = 'aes-256-gcm'

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EncryptionError'
  }
}

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new EncryptionError(
      'ENCRYPTION_KEY 환경변수가 설정되지 않았습니다. base64로 인코딩된 32바이트 키를 등록해주세요.'
    )
  }

  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw new EncryptionError('ENCRYPTION_KEY는 base64 형식이어야 합니다.')
  }

  if (key.length !== 32) {
    throw new EncryptionError(
      `ENCRYPTION_KEY 길이가 ${key.length}바이트입니다. 32바이트 키를 사용해주세요.`
    )
  }

  cachedKey = key
  return key
}

/**
 * 테스트 전용 — 캐시된 키를 초기화한다.
 * 프로덕션 코드에서는 호출하지 말 것.
 */
export function _resetKeyCache(): void {
  cachedKey = null
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VERSION_PREFIX)
}

export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new EncryptionError('암호화할 값이 비어있습니다.')
  }

  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  const payload = Buffer.concat([iv, ciphertext, authTag])
  return `${VERSION_PREFIX}${payload.toString('base64')}`
}

export function decryptSecret(payload: string | null | undefined): string {
  if (typeof payload !== 'string' || payload.length === 0) {
    throw new EncryptionError('복호화할 값이 비어있습니다.')
  }

  if (!isEncrypted(payload)) {
    return payload
  }

  const key = getKey()
  const buf = Buffer.from(payload.slice(VERSION_PREFIX.length), 'base64')

  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new EncryptionError('암호문 길이가 올바르지 않습니다.')
  }

  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new EncryptionError('복호화에 실패했습니다. 키가 변경되었거나 데이터가 손상되었을 수 있습니다.')
  }
}

/**
 * 응답 직렬화 시 secret을 마스킹한다.
 * 길이가 4 이하인 값은 모두 `***`로, 그 외는 끝 4글자만 노출.
 */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length <= 4) return '***'
  return `***${value.slice(-4)}`
}
