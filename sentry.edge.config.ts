/**
 * Sentry Edge 런타임(미들웨어 등) 초기화
 * src/instrumentation.ts의 register()에서 로드된다.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_ENV || 'local',
  tracesSampleRate: 0.1,
})
