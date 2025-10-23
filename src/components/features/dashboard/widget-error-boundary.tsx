'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { WidgetErrorFallback } from '@ui/error-fallback'

interface Props {
  children: ReactNode
  widgetId: string
  widgetTitle?: string
  fallback?: ReactNode
  onReset?: () => void
}

/**
 * 위젯 전용 Error Boundary
 * react-error-boundary 라이브러리를 사용하여 각 위젯의 에러를 격리
 */
export function WidgetErrorBoundary({
  children,
  widgetId,
  widgetTitle,
  fallback,
  onReset,
}: Props) {
  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    console.error(`Widget Error [${widgetId}]:`, error, info)
  }

  const handleReset = () => {
    console.log(`Resetting widget [${widgetId}]`)
    onReset?.()
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) =>
        fallback || (
          <WidgetErrorFallback
            error={error}
            resetErrorBoundary={resetErrorBoundary}
            widgetTitle={widgetTitle}
          />
        )
      }
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  )
}
