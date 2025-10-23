/**
 * Short URL Utility
 *
 * 단축 URL 생성 및 관리 유틸리티
 */

import { nanoid } from 'nanoid'

/**
 * 단축 코드 생성
 *
 * @param length - 코드 길이 (기본: 6자)
 * @returns 단축 코드 (예: 'abc123')
 */
export function generateShortCode(length: number = 6): string {
  return nanoid(length)
}

/**
 * 단축 URL 생성 (도메인 포함)
 *
 * @param shortCode - 단축 코드
 * @param baseUrl - 기본 URL (선택적, 없으면 환경 변수 사용)
 * @returns 전체 단축 URL
 */
export function generateShortUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://acadesk.app'
  return `${base}/short/${shortCode}`
}

/**
 * 리포트 공유 링크 생성
 *
 * @param shareLinkId - 공유 링크 ID (UUID)
 * @param baseUrl - 기본 URL (선택적)
 * @returns 리포트 링크 URL
 */
export function generateReportShareUrl(shareLinkId: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://acadesk.app'
  return `${base}/r/${shareLinkId}`
}

/**
 * 문자 메시지용 짧은 URL 텍스트 생성
 *
 * @param shortCode - 단축 코드
 * @returns 문자용 짧은 도메인 URL (예: 'aca.sk/abc123')
 */
export function generateSmsShortUrl(shortCode: string): string {
  // 실제 운영 시에는 짧은 도메인 사용 (예: aca.sk)
  // 개발 환경에서는 localhost 사용
  const isDev = process.env.NODE_ENV === 'development'
  const domain = isDev ? 'localhost:3000' : process.env.NEXT_PUBLIC_SHORT_DOMAIN || 'aca.sk'
  const protocol = isDev ? 'http://' : 'https://'

  return `${protocol}${domain}/s/${shortCode}`
}

/**
 * 단축 URL 유효성 검증
 *
 * @param shortCode - 검증할 단축 코드
 * @returns 유효 여부
 */
export function isValidShortCode(shortCode: string): boolean {
  // 6-8자 영숫자
  return /^[a-zA-Z0-9]{6,8}$/.test(shortCode)
}

/**
 * 리포트 문자 메시지 본문 생성
 *
 * @param params - 메시지 파라미터
 * @returns 문자 본문
 */
export function generateReportSmsMessage(params: {
  studentName: string
  month?: number
  reportType?: string
  shortUrl: string
}): {
  message: string
  type: 'SMS' | 'LMS'
} {
  const { studentName, month, reportType = '성적', shortUrl } = params

  // SMS 버전 (90바이트 이내)
  const smsMessage = `[Acadesk] ${studentName} ${month ? `${month}월 ` : ''}${reportType}표가 도착했습니다.\n확인: ${shortUrl}`

  // LMS 버전 (더 상세한 안내)
  const lmsMessage = `[Acadesk 성적 리포트]

${studentName} 학생의 ${month ? `${month}월 ` : ''}${reportType}표가 도착했습니다.

아래 링크를 클릭하여 확인해주세요:
${shortUrl}

※ 링크는 7일간 유효합니다.
※ 문의사항은 학원으로 연락주세요.`

  // 바이트 계산 (한글 2바이트, 영숫자 1바이트)
  const smsBytes = Buffer.byteLength(smsMessage, 'utf-8')

  // 90바이트 이하면 SMS, 초과하면 LMS
  if (smsBytes <= 90) {
    return { message: smsMessage, type: 'SMS' }
  } else {
    return { message: lmsMessage, type: 'LMS' }
  }
}

/**
 * 링크 만료일 계산
 *
 * @param days - 유효 기간 (일 수)
 * @returns 만료일 (ISO string)
 */
export function calculateLinkExpiry(days: number = 7): string {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + days)
  return expiryDate.toISOString()
}
