import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAllowedRedirectTarget, isValidShortCode } from './short-url'

describe('isValidShortCode', () => {
  it('nanoid 형식 6-8자만 허용', () => {
    expect(isValidShortCode('abc123')).toBe(true)
    expect(isValidShortCode('Ab_-12cd')).toBe(true)
    expect(isValidShortCode('short')).toBe(false)
    expect(isValidShortCode('toolongcode1')).toBe(false)
    expect(isValidShortCode('abc/12')).toBe(false)
  })
})

describe('isAllowedRedirectTarget (오픈 리다이렉트 방지)', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalVercelUrl = process.env.VERCEL_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://acadesk.app'
    delete process.env.VERCEL_URL
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    if (originalVercelUrl) process.env.VERCEL_URL = originalVercelUrl
  })

  it('앱 도메인 대상은 허용', () => {
    expect(isAllowedRedirectTarget('https://acadesk.app/r/some-link-id')).toBe(true)
    expect(isAllowedRedirectTarget('http://localhost:3000/r/x')).toBe(true)
    expect(isAllowedRedirectTarget('http://localhost:3001/r/x')).toBe(true)
  })

  it('외부 도메인은 차단 (피싱 리다이렉트 방지)', () => {
    expect(isAllowedRedirectTarget('https://evil.example.com/phish')).toBe(false)
    expect(isAllowedRedirectTarget('https://acadesk.app.evil.com/r/x')).toBe(false)
  })

  it('http/https 외 스킴과 손상된 URL은 차단', () => {
    expect(isAllowedRedirectTarget('javascript:alert(1)')).toBe(false)
    expect(isAllowedRedirectTarget('not-a-url')).toBe(false)
    expect(isAllowedRedirectTarget('')).toBe(false)
  })

  it('VERCEL_URL 호스트는 허용', () => {
    process.env.VERCEL_URL = 'acadesk-web-abc.vercel.app'
    expect(isAllowedRedirectTarget('https://acadesk-web-abc.vercel.app/r/x')).toBe(true)
    expect(isAllowedRedirectTarget('https://other-project.vercel.app/r/x')).toBe(false)
  })
})
