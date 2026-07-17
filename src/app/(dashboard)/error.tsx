'use client'

/**
 * 대시보드 라우트 그룹 공통 에러 바운더리
 * (dashboard) 하위 모든 세그먼트의 렌더/데이터 오류를 잡는다.
 * 더 구체적인 error.tsx가 있는 세그먼트(예: attendance)는 그쪽이 우선한다.
 */

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Dashboard route error:', error)
  }, [error])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-destructive mb-2">
          페이지를 불러오지 못했습니다
        </h2>
        <p className="text-muted-foreground mb-4">
          일시적인 오류일 수 있습니다. 다시 시도해도 반복되면 관리자에게 문의해주세요.
        </p>
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      </div>
    </div>
  )
}
