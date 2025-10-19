/**
 * Manage Kiosk Session Use Case
 * 키오스크 세션 관리 유스케이스 - Application Layer
 *
 * 이 Use Case는 클라이언트 사이드에서만 동작하며,
 * sessionStorage를 사용하여 세션을 관리합니다.
 */

export interface KioskSessionDTO {
  studentId: string
  studentCode: string
  studentName: string
  loginAt: string
}

interface Student {
  id: string
  student_code: string
  name: string
}

const KIOSK_SESSION_KEY = 'kiosk_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8시간

export class ManageKioskSessionUseCase {
  /**
   * 키오스크 세션 생성
   */
  createSession(student: Student): void {
    const session: KioskSessionDTO = {
      studentId: student.id,
      studentCode: student.student_code,
      studentName: student.name,
      loginAt: new Date().toISOString(),
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(KIOSK_SESSION_KEY, JSON.stringify(session))
    }
  }

  /**
   * 현재 키오스크 세션 조회
   */
  getSession(): KioskSessionDTO | null {
    if (typeof window === 'undefined') return null

    const sessionData = sessionStorage.getItem(KIOSK_SESSION_KEY)
    if (!sessionData) return null

    try {
      const session: KioskSessionDTO = JSON.parse(sessionData)

      // 세션 유효기간 체크
      const loginAt = new Date(session.loginAt).getTime()
      const now = new Date().getTime()

      if (now - loginAt > SESSION_DURATION_MS) {
        // 세션 만료
        this.clearSession()
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
  clearSession(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(KIOSK_SESSION_KEY)
    }
  }

  /**
   * 키오스크 세션 확인
   */
  hasActiveSession(): boolean {
    return this.getSession() !== null
  }
}
