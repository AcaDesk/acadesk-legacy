import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface WidgetSkeletonProps {
  variant?: 'stats' | 'list' | 'chart' | 'calendar' | 'table' | 'default'
  className?: string
}

/**
 * 위젯 스켈레톤 - 다양한 위젯 타입을 위한 로딩 상태
 */
export function WidgetSkeleton({ variant = 'default', className }: WidgetSkeletonProps) {
  // Stats card skeleton (KPI cards)
  if (variant === 'stats') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // List skeleton (학생 리스트, 활동 피드 등)
  if (variant === 'list') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Chart skeleton (차트, 그래프)
  if (variant === 'chart') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-end gap-2">
                <Skeleton
                  className="w-full rounded"
                  style={{ height: `${Math.random() * 100 + 50}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calendar skeleton
  if (variant === 'calendar') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Table skeleton
  if (variant === 'table') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex gap-4 pb-3 border-b">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default skeleton
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}

/**
 * 컴팩트한 위젯 스켈레톤 (작은 위젯용)
 */
export function CompactWidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * KPI 카드 그리드 스켈레톤
 */
export function KPIGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <WidgetSkeleton key={i} variant="stats" />
      ))}
    </div>
  )
}

/**
 * 인라인 로딩 스켈레톤 (섹션 내부용)
 */
export function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-md bg-muted/50 animate-pulse', className)}>
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}
