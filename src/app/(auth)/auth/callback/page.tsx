/**
 * Auth Callback Page (Server Component)
 *
 * 완전한 server-side + service_role 기반 인증 콜백 처리
 *
 * ✅ 메일 스캐너 대응:
 * - User-Agent 헤더로 메일 스캐너 감지
 * - 스캐너 감지 시 대기 페이지로 리다이렉트 (토큰 소비 방지)
 * - 실제 사용자만 Server Action으로 인증 처리
 *
 * 플로우:
 * 1. 사용자가 이메일 링크 클릭 → callback 페이지 도착
 * 2. User-Agent로 메일 스캐너 감지
 * 3. 스캐너가 아니면 대기 페이지 표시
 * 4. 사용자 클릭 → handleAuthCallback Server Action 호출
 * 5. 프로필 생성 및 온보딩 상태 확인 후 리다이렉트
 *
 * 변경 이력:
 * - 2025-10-23: 완전한 Server Component + Server Action 기반으로 변경
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import CallbackWaitPage from './wait-page'

/**
 * 메일 스캐너 User-Agent 패턴
 */
const MAIL_SCANNER_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /slackbot/i,
  /vkShare/i,
  /W3C_Validator/i,
  /redditbot/i,
  /Applebot/i,
  /WhatsApp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /SkypeUriPreview/i,
  /nuzzel/i,
  /Discordbot/i,
  /Google Page Speed/i,
  /Qwantify/i,
  /pinterestbot/i,
  /Bitrix link preview/i,
  /XING-contenttabreceiver/i,
  /Chrome-Lighthouse/i,
  /TelegramBot/i,
  /SafeLinks/i,
  /ProofPoint/i,
  /Mimecast/i,
  /MailScanner/i,
  /UrlScan/i,
]

/**
 * User-Agent로 메일 스캐너 여부 판단
 */
function isMailScanner(userAgent: string | null): boolean {
  if (!userAgent) return false
  return MAIL_SCANNER_PATTERNS.some((pattern) => pattern.test(userAgent))
}

interface CallbackPageProps {
  searchParams: Promise<{ code?: string; type?: string }>
}

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams
  const code = params.code
  const type = params.type || 'signup'

  // 1. code 파라미터 검증
  if (!code) {
    console.error('[auth/callback] Missing code parameter')
    redirect('/auth/login')
  }

  // 2. User-Agent로 메일 스캐너 감지
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')

  if (isMailScanner(userAgent)) {
    console.log('[auth/callback] Mail scanner detected, showing wait page:', { userAgent })
    // 스캐너는 대기 페이지를 보게 함 (토큰 소비 방지)
    return <CallbackWaitPage code={code} type={type} />
  }

  // 3. 실제 사용자 → 대기 페이지 표시 (사용자 클릭으로 Server Action 호출)
  console.log('[auth/callback] Real user detected, showing wait page')
  return <CallbackWaitPage code={code} type={type} />
}
