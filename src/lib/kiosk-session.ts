/**
 * Kiosk Session Management Utilities
 * 클라이언트 사이드 세션 관리 (localStorage/sessionStorage)
 */

export interface KioskSession {
  studentId: string
  studentCode: string
  studentName: string
  tenantId: string
  loginAt: string
}

const KIOSK_SESSION_KEY = 'kiosk_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8시간

/**
 * 키오스크 세션 생성
 */
export function createKioskSession(student: {
  id: string
  student_code: string
  name: string
  tenant_id: string
}): void {
  const session: KioskSession = {
    studentId: student.id,
    studentCode: student.student_code,
    studentName: student.name,
    tenantId: student.tenant_id,
    loginAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(KIOSK_SESSION_KEY, JSON.stringify(session))
  }
}

/**
 * 현재 키오스크 세션 조회
 */
export function getKioskSession(): KioskSession | null {
  if (typeof window === 'undefined') return null

  const sessionData = sessionStorage.getItem(KIOSK_SESSION_KEY)
  if (!sessionData) return null

  try {
    const session: KioskSession = JSON.parse(sessionData)

    // 세션 유효기간 체크
    const loginAt = new Date(session.loginAt).getTime()
    const now = new Date().getTime()

    if (now - loginAt > SESSION_DURATION_MS) {
      // 세션 만료
      clearKioskSession()
      return null
    }

    return session
  } catch {
    return null
  }
}

/**
 * 키오스크 세션 삭제
 */
export function clearKioskSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(KIOSK_SESSION_KEY)
  }
}

/**
 * 키오스크 세션 확인
 */
export function hasActiveKioskSession(): boolean {
  return getKioskSession() !== null
}
