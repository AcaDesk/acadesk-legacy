/**
 * Kiosk 기기별 설정 — 브라우저 localStorage 기반.
 *
 * SSR 환경에서 `typeof window` 체크를 캡슐화해 호출처마다 가드 코드가
 * 중복되지 않도록 한다. 키 이름도 한 곳에서만 관리해 typo 방지.
 *
 * 데이터:
 *  - tenantId: 키오스크 모드가 동작할 학원 ID (setup 페이지에서 등록)
 *  - exitPin : 관리자 종료 PIN (4자리, 기본값 9999)
 */

const TENANT_ID_KEY = 'kiosk_tenant_id'
const EXIT_PIN_KEY = 'kiosk_exit_pin'
const DEFAULT_EXIT_PIN = '9999'

export const kioskStorage = {
  getTenantId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TENANT_ID_KEY)
  },
  setTenantId(id: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(TENANT_ID_KEY, id)
  },
  clearTenantId(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TENANT_ID_KEY)
  },
  /** 종료 PIN 조회 — 미설정 시 기본값(9999) 반환. 인증 비교용. */
  getExitPin(): string {
    if (typeof window === 'undefined') return DEFAULT_EXIT_PIN
    return localStorage.getItem(EXIT_PIN_KEY) ?? DEFAULT_EXIT_PIN
  },
  /** 종료 PIN 원시값 — 미설정 시 null. 설정 화면의 "미설정 (기본 9999)" 표시용. */
  getExitPinRaw(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(EXIT_PIN_KEY)
  },
  setExitPin(pin: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(EXIT_PIN_KEY, pin)
  },
}
