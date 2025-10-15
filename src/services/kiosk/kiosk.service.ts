/**
 * 키오스크 서비스
 * 학생 PIN 인증 및 세션 관리
 */

import { createClient } from '@/lib/supabase/client'

export interface Student {
  id: string
  student_code: string
  name: string
  grade: string | null
  profile_image_url: string | null
}

export interface KioskSession {
  studentId: string
  studentCode: string
  studentName: string
  loginAt: string
}

const KIOSK_SESSION_KEY = 'kiosk_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8시간

/**
 * PIN으로 학생 인증
 */
export async function authenticateWithPin(
  studentCode: string,
  pin: string
): Promise<{ student: Student | null; error: Error | null }> {
  try {
    const supabase = createClient()

    // 학생 코드와 PIN으로 조회
    const { data: student, error } = await supabase
      .from('students')
      .select('id, student_code, name, grade, profile_image_url, kiosk_pin')
      .eq('student_code', studentCode.toUpperCase())
      .eq('kiosk_pin', pin)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('PIN 인증 오류:', error)
      return {
        student: null,
        error: new Error('학생 코드 또는 PIN이 일치하지 않습니다.'),
      }
    }

    if (!student) {
      return {
        student: null,
        error: new Error('학생을 찾을 수 없습니다.'),
      }
    }

    // kiosk_pin 필드 제거 후 반환
    const { kiosk_pin: _, ...studentData } = student

    return { student: studentData as Student, error: null }
  } catch (error) {
    console.error('PIN 인증 중 오류:', error)
    return {
      student: null,
      error: error as Error,
    }
  }
}

/**
 * 키오스크 세션 생성
 */
export function createKioskSession(student: Student): void {
  const session: KioskSession = {
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
