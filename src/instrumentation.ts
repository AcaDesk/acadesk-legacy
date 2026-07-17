/**
 * Next.js 서버 계측 진입점
 * 서버/엣지 런타임 기동 시 Sentry를 초기화하고,
 * RSC/Server Action에서 처리되지 않은 요청 에러를 Sentry로 전달한다.
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
