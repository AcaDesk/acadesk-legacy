'use client'

/**
 * Error Boundary Component
 *
 * React 에러 바운더리로 클라이언트 렌더링 오류를 포착하고 사용자 친화적인 UI를 표시
 */

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card'
import { getErrorMessage, logError } from '@/lib/error-handlers'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Class Component
 *
 * React Error Boundaries must be class components
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with stack trace
    logError(error, {
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary',
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError)
      }

      // Default error UI
      return (
        <DefaultErrorFallback error={this.state.error} reset={this.resetError} />
      )
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI
 */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const errorMessage = getErrorMessage(error)
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>오류가 발생했습니다</CardTitle>
          </div>
          <CardDescription>
            예상치 못한 오류가 발생했습니다. 불편을 드려 죄송합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>

          {isDevelopment && error.stack && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                스택 트레이스 보기
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Button onClick={() => (window.location.href = '/dashboard')} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            홈으로
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Compact Error Fallback (for widgets and small components)
 */
export function CompactErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const errorMessage = getErrorMessage(error)

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{errorMessage}</p>
      <Button onClick={reset} size="sm" variant="outline">
        <RefreshCw className="mr-2 h-3 w-3" />
        다시 시도
      </Button>
    </div>
  )
}

/**
 * Hook-like wrapper for functional components
 * Usage: <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
 */
export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

/**
 * Widget Error Boundary (compact version)
 */
export function WidgetErrorBoundary({
  children,
  widgetName,
}: {
  children: ReactNode
  widgetName?: string
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <CompactErrorFallback error={error} reset={reset} />}
      onError={(error) => {
        logError(error, {
          type: 'widget_error',
          widgetName,
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
