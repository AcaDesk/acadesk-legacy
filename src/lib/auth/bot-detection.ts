/**
 * Bot Detection Utility
 *
 * 이메일 보안 스캐너 및 봇 User-Agent 감지
 * - Gmail ImageProxy, Outlook SafeLink, 기타 이메일 스캐너
 * - 일반 크롤러, 봇
 *
 * 주의: 이 유틸리티는 서버 컴포넌트/API 라우트에서만 사용 가능
 */

/**
 * 알려진 봇/스캐너 User-Agent 패턴
 */
const BOT_PATTERNS = [
  // 이메일 보안 스캐너
  'GoogleImageProxy',
  'Google-Safety',
  'OutlookLink',
  'Thunderhead',
  'Barracuda',
  'Proofpoint',
  'Mimecast',
  'FireEye',

  // 일반 크롤러/봇
  'bot',
  'crawler',
  'spider',
  'scraper',
  'Googlebot',
  'Bingbot',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'WhatsApp',

  // 기타
  'curl',
  'wget',
  'python-requests',
  'axios',
  'okhttp',
] as const

/**
 * User-Agent가 봇/스캐너인지 확인
 * @param userAgent - HTTP User-Agent 헤더 값
 * @returns 봇이면 true, 아니면 false
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) {
    // User-Agent가 없으면 의심스럽지만, 일부 브라우저에서 의도적으로 숨기기도 함
    return false
  }

  const ua = userAgent.toLowerCase()

  // 패턴 매칭
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern.toLowerCase()))
}

/**
 * 봇 감지 결과 및 상세 정보
 */
export interface BotDetectionResult {
  /** 봇으로 판단되었는지 */
  isBot: boolean
  /** 매칭된 패턴 (봇인 경우) */
  matchedPattern?: string
  /** 원본 User-Agent */
  userAgent: string | null
}

/**
 * User-Agent를 분석하여 봇 감지 결과 반환
 * @param userAgent - HTTP User-Agent 헤더 값
 * @returns 봇 감지 결과 객체
 */
export function detectBot(userAgent: string | null | undefined): BotDetectionResult {
  if (!userAgent) {
    return {
      isBot: false,
      userAgent: null,
    }
  }

  const ua = userAgent.toLowerCase()

  // 매칭된 패턴 찾기
  const matchedPattern = BOT_PATTERNS.find((pattern) => ua.includes(pattern.toLowerCase()))

  return {
    isBot: !!matchedPattern,
    matchedPattern,
    userAgent,
  }
}

/**
 * Request 객체에서 User-Agent를 추출하여 봇 감지
 * Next.js API Route / Route Handler에서 사용
 * @param request - Next.js Request 객체
 * @returns 봇 감지 결과
 */
export function detectBotFromRequest(request: Request): BotDetectionResult {
  const userAgent = request.headers.get('user-agent')
  return detectBot(userAgent)
}

/**
 * 봇 감지 로깅 헬퍼
 * @param result - 봇 감지 결과
 * @param context - 추가 컨텍스트 (예: 라우트 이름, 요청 ID)
 */
export function logBotDetection(result: BotDetectionResult, context?: Record<string, any>): void {
  if (result.isBot) {
    console.warn('[BotDetection] Bot/Scanner detected:', {
      ...context,
      matchedPattern: result.matchedPattern,
      userAgent: result.userAgent,
      timestamp: new Date().toISOString(),
    })
  } else {
    console.log('[BotDetection] Human user detected:', {
      ...context,
      userAgent: result.userAgent,
      timestamp: new Date().toISOString(),
    })
  }
}
