/**
 * Sentry 서버 런타임(Node.js) 초기화
 * src/instrumentation.ts의 register()에서 로드된다.
 * DSN(NEXT_PUBLIC_SENTRY_DSN) 미설정 시 비활성 — 로컬 개발에 영향 없음.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_ENV || 'local',
  // 에러 트래킹이 주 목적 — 성능 추적은 표본만 수집해 비용 절제
  tracesSampleRate: 0.1,
})
