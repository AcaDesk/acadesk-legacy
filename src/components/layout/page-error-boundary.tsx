'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@ui/error-fallback'
import { PageWrapper } from './page-wrapper'

interface PageErrorBoundaryProps {
  children: ReactNode
  pageName?: string
  onReset?: () => void
}

/**
 * 페이지 전체를 감싸는 Error Boundary
 *
 * 페이지 레벨의 에러를 캐치하고 full-page 에러 화면을 표시합니다.
 *
 * 사용법:
 * ```tsx
 * export default function MyPage() {
 *   return (
 *     <PageErrorBoundary pageName="학생 관리">
 *       <PageContent />
 *     </PageErrorBoundary>
 *   )
 * }
 * ```
 */
export function PageErrorBoundary({
  children,
  pageName = '페이지',
  onReset,
}: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: { componentStack?: string | null }) => {
    console.error(`Page Error [${pageName}]:`, error, errorInfo)

    // TODO: 에러 모니터링 서비스에 전송 (Sentry 등)
    // if (typeof window !== 'undefined') {
    //   Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //     tags: {
    //       page: pageName,
    //     },
    //   })
    // }
  }

  const handleReset = () => {
    console.log(`Resetting page [${pageName}]`)
    onReset?.()

    // 페이지 새로고침
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <PageWrapper>
          <ErrorFallback
            error={error}
            resetErrorBoundary={resetErrorBoundary}
            variant="full-page"
            title={`${pageName} 로딩 실패`}
            description="페이지를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 홈으로 돌아가세요."
          />
        </PageWrapper>
      )}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * 섹션 레벨 Error Boundary (페이지의 일부분)
 *
 * 페이지 내 특정 섹션을 보호합니다.
 */
export function SectionErrorBoundary({
  children,
  sectionName = '섹션',
  onReset,
}: {
  children: ReactNode
  sectionName?: string
  onReset?: () => void
}) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          variant="default"
          title={`${sectionName} 로딩 실패`}
          description="이 섹션을 불러오는 중 문제가 발생했습니다."
        />
      )}
      onError={(error) => console.error(`Section Error [${sectionName}]:`, error)}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  )
}
