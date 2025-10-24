import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@ui/card'
import { cn } from '@/lib/utils'

export interface LoadingStateProps {
  variant?: 'inline' | 'card' | 'fullscreen' | 'spinner'
  message?: string
  className?: string
}

/**
 * Standard Loading State Component
 *
 * Provides consistent loading indicators across the application.
 * Use this instead of custom Loader2 implementations.
 *
 * @example
 * // Inline loading
 * {loading && <LoadingState variant="inline" message="데이터 로딩 중..." />}
 *
 * // Card loading
 * {loading ? (
 *   <LoadingState variant="card" message="학생 목록 로딩 중..." />
 * ) : (
 *   <StudentList data={data} />
 * )}
 *
 * // Just spinner
 * {loading && <LoadingState variant="spinner" />}
 */
export function LoadingState({
  variant = 'inline',
  message = '로딩 중...',
  className,
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3 text-muted-foreground', className)}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'fullscreen') {
    return (
      <div
        className={cn(
          'fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
          className
        )}
      >
        <div className="text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Button Loading State
 *
 * Use inside buttons for loading states.
 *
 * @example
 * <Button disabled={loading}>
 *   {loading && <ButtonLoadingSpinner />}
 *   {loading ? '저장 중...' : '저장'}
 * </Button>
 */
export function ButtonLoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('mr-2 h-4 w-4 animate-spin', className)} />
}

/**
 * Empty State Component
 *
 * Use when there's no data to display.
 * Companion to LoadingState for complete state management.
 *
 * @example
 * {data.length === 0 && (
 *   <EmptyState
 *     icon={<Users />}
 *     title="학생이 없습니다"
 *     description="새 학생을 등록하여 시작하세요"
 *   />
 * )}
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="py-12">
        <div className="text-center">
          {icon && (
            <div className="mx-auto mb-4 text-muted-foreground/50 flex items-center justify-center">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          )}
          {action && <div className="mt-6">{action}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
