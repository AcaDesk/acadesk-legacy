'use client'

import { AlertTriangle, RefreshCw, Home, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
  variant?: 'default' | 'compact' | 'inline' | 'full-page'
  title?: string
  description?: string
  showDetails?: boolean
  className?: string
}

/**
 * 재사용 가능한 에러 폴백 컴포넌트
 * react-error-boundary와 함께 사용
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  variant = 'default',
  title = '문제가 발생했습니다',
  description = '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
  showDetails = process.env.NODE_ENV === 'development',
  className,
}: ErrorFallbackProps) {
  // Compact variant - 작은 위젯이나 카드 내부용
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-4 text-center',
          'bg-destructive/5 rounded-lg border border-destructive/20',
          className
        )}
      >
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        {resetErrorBoundary && (
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            다시 시도
          </Button>
        )}
      </div>
    )
  }

  // Inline variant - 리스트 아이템이나 작은 섹션용
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-md',
          'bg-destructive/5 border border-destructive/20',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        {resetErrorBoundary && (
          <Button
            onClick={resetErrorBoundary}
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  // Full-page variant - 전체 페이지 에러용
  if (variant === 'full-page') {
    return (
      <div className={cn('min-h-[60vh] flex items-center justify-center p-4', className)}>
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showDetails && error && (
              <details className="text-xs bg-muted p-3 rounded-md">
                <summary className="cursor-pointer font-medium mb-2">
                  오류 상세 정보
                </summary>
                <pre className="whitespace-pre-wrap break-words text-destructive mt-2">
                  {error.toString()}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              {resetErrorBoundary && (
                <Button
                  onClick={resetErrorBoundary}
                  variant="default"
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
              )}
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  홈으로
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default variant - 카드 형태의 위젯용
  return (
    <Card className={cn('border-destructive/50 bg-destructive/5', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive text-base">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          {showDetails && error && (
            <details className="text-xs bg-muted p-3 rounded-md">
              <summary className="cursor-pointer font-medium mb-2">
                오류 상세 정보
              </summary>
              <pre className="whitespace-pre-wrap break-words text-destructive">
                {error.toString()}
              </pre>
            </details>
          )}
        </div>
        {resetErrorBoundary && (
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 위젯 전용 에러 폴백 (기존 WidgetErrorBoundary와 호환)
 */
export function WidgetErrorFallback({
  error,
  resetErrorBoundary,
  widgetTitle,
}: {
  error?: Error
  resetErrorBoundary?: () => void
  widgetTitle?: string
}) {
  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={resetErrorBoundary}
      variant="default"
      title="위젯 로딩 오류"
      description={`${widgetTitle || '위젯'}을 불러오는 중 문제가 발생했습니다.`}
    />
  )
}

/**
 * 리스트 아이템 에러 폴백
 */
export function ListItemErrorFallback({
  error,
  resetErrorBoundary,
  itemName = '항목',
}: {
  error?: Error
  resetErrorBoundary?: () => void
  itemName?: string
}) {
  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={resetErrorBoundary}
      variant="inline"
      title={`${itemName} 로딩 실패`}
      description="이 항목을 불러올 수 없습니다"
    />
  )
}

/**
 * 섹션 에러 폴백
 */
export function SectionErrorFallback({
  error,
  resetErrorBoundary,
  sectionTitle,
  actionHref,
  actionLabel = '페이지로 이동',
}: {
  error?: Error
  resetErrorBoundary?: () => void
  sectionTitle?: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive text-base">
          <AlertTriangle className="h-5 w-5" />
          {sectionTitle || '섹션'} 로딩 오류
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          이 섹션을 불러오는 중 문제가 발생했습니다.
        </p>
        <div className="flex gap-2">
          {resetErrorBoundary && (
            <Button
              onClick={resetErrorBoundary}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
          )}
          {actionHref && (
            <Link href={actionHref}>
              <Button variant="outline" size="sm" className="gap-2">
                {actionLabel}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-xs bg-muted p-3 rounded-md">
            <summary className="cursor-pointer font-medium mb-2">
              오류 상세 정보
            </summary>
            <pre className="whitespace-pre-wrap break-words text-destructive">
              {error.toString()}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
