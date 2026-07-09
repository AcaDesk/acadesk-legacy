import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createKioskDeviceToken, verifyKioskDeviceToken } from './kiosk-token'

const TENANT_ID = 'a3f1c2e4-0000-7000-8000-000000000001'

describe('kiosk-token', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('발급한 토큰을 검증하면 tenantId를 반환한다', () => {
    const token = createKioskDeviceToken(TENANT_ID)
    expect(verifyKioskDeviceToken(token)).toBe(TENANT_ID)
  })

  it('null/빈 토큰은 거부한다', () => {
    expect(verifyKioskDeviceToken(null)).toBeNull()
    expect(verifyKioskDeviceToken(undefined)).toBeNull()
    expect(verifyKioskDeviceToken('')).toBeNull()
  })

  it('형식이 잘못된 토큰은 거부한다', () => {
    expect(verifyKioskDeviceToken('not-a-token')).toBeNull()
    expect(verifyKioskDeviceToken('a.b.c')).toBeNull()
  })

  it('페이로드가 변조된 토큰은 거부한다', () => {
    const token = createKioskDeviceToken(TENANT_ID)
    const [, signature] = token.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ v: 'v1', t: 'other-tenant-id', iat: Date.now() })
    ).toString('base64url')
    expect(verifyKioskDeviceToken(`${forgedPayload}.${signature}`)).toBeNull()
  })

  it('서명이 변조된 토큰은 거부한다', () => {
    const token = createKioskDeviceToken(TENANT_ID)
    const [payload] = token.split('.')
    expect(verifyKioskDeviceToken(`${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull()
  })

  it('다른 시크릿으로 서명된 토큰은 거부한다', () => {
    const token = createKioskDeviceToken(TENANT_ID)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'rotated-secret')
    expect(verifyKioskDeviceToken(token)).toBeNull()
  })

  it('1년이 지난 토큰은 만료 처리한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = createKioskDeviceToken(TENANT_ID)

    vi.setSystemTime(new Date('2027-01-02T00:00:00Z'))
    expect(verifyKioskDeviceToken(token)).toBeNull()
  })
})
