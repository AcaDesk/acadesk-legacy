/**
 * Sentry 클라이언트(브라우저) 초기화
 * Next.js 15.3+의 클라이언트 계측 진입점.
 * 번들 절제를 위해 에러 수집만 활성화한다 (Replay/브라우저 트레이싱 미사용).
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_ENV || 'local',
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
