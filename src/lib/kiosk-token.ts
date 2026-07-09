/**
 * 키오스크 디바이스 토큰 (서버 전용)
 *
 * 키오스크 Server Action은 비로그인 상태에서 호출되므로, 클라이언트가 보내는
 * 원시 tenant_id를 신뢰하면 임의 학원의 데이터에 접근할 수 있다. 대신 설정
 * 시점에 스태프 인증 하에 HMAC 서명된 디바이스 토큰을 발급하고, 이후 모든
 * 키오스크 액션은 토큰 검증을 통해 tenant_id를 서버에서 유도한다.
 *
 * - 서명 키: SUPABASE_SERVICE_ROLE_KEY에서 파생 (별도 env 불필요)
 * - 유효기간: 1년 (만료 시 키오스크 설정 페이지에서 재발급)
 * - SUPABASE_SERVICE_ROLE_KEY 로테이션 시 모든 디바이스 토큰이 무효화되므로
 *   각 키오스크에서 재설정 필요
 *
 * 주의: 서버 코드('use server' 액션)에서만 import할 것 — 시크릿 파생 키 사용.
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto'

const TOKEN_VERSION = 'v1'
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000 // 1년

function getSigningKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createHash('sha256').update(`kiosk-device-token:${secret}`).digest()
}

/**
 * 디바이스 토큰 발급 — 반드시 스태프 인증 이후에만 호출할 것
 */
export function createKioskDeviceToken(tenantId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ v: TOKEN_VERSION, t: tenantId, iat: Date.now() })
  ).toString('base64url')
  const signature = createHmac('sha256', getSigningKey()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

/**
 * 디바이스 토큰 검증 — 유효하면 tenantId, 아니면 null
 */
export function verifyKioskDeviceToken(token: string | null | undefined): string | null {
  if (!token) return null

  const dotIndex = token.indexOf('.')
  if (dotIndex <= 0) return null

  const payload = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)

  const expected = createHmac('sha256', getSigningKey()).update(payload).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: string
      t?: string
      iat?: number
    }
    if (data.v !== TOKEN_VERSION || typeof data.t !== 'string' || !data.t) return null
    if (typeof data.iat !== 'number' || Date.now() - data.iat > MAX_AGE_MS) return null
    return data.t
  } catch {
    return null
  }
}
