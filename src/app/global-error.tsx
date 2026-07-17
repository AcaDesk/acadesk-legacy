'use client'

/**
 * 루트 레이아웃 렌더 오류 폴백 (최후 방어선)
 * 루트 layout.tsx 자체가 실패하면 전역 CSS/폰트도 없으므로 인라인 스타일만 사용한다.
 */

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            문제가 발생했습니다
          </h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            일시적인 오류일 수 있습니다. 다시 시도해주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '0.5rem',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
