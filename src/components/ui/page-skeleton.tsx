import { Card, CardContent, CardHeader } from '@ui/card'
import { Skeleton } from '@ui/skeleton'
import { cn } from '@/lib/utils'
import { WidgetSkeleton } from './widget-skeleton'

export interface PageSkeletonProps {
  variant?: 'list' | 'grid' | 'detail' | 'form' | 'dashboard'
  className?: string
}

/**
 * Standardized Page Skeleton
 *
 * Provides consistent loading states for different page types.
 * Use this for full-page loading states.
 *
 * @example
 * // In a loading state or Suspense fallback
 * <PageSkeleton variant="list" />
 */
export function PageSkeleton({ variant = 'list', className }: PageSkeletonProps) {
  return (
    <div className={cn('p-6 lg:p-8 space-y-6', className)}>
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content by variant */}
      {variant === 'list' && <ListPageSkeleton />}
      {variant === 'grid' && <GridPageSkeleton />}
      {variant === 'detail' && <DetailPageSkeleton />}
      {variant === 'form' && <FormPageSkeleton />}
      {variant === 'dashboard' && <DashboardPageSkeleton />}
    </div>
  )
}

/**
 * List Page Skeleton
 * For pages with search + data table/list (students, textbooks, etc.)
 */
function ListPageSkeleton() {
  return (
    <>
      {/* Search/Filter Bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-full max-w-md" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

/**
 * Grid Page Skeleton
 * For pages with card grids (consultations, reports, etc.)
 */
function GridPageSkeleton() {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <WidgetSkeleton key={i} variant="stats" />
        ))}
      </div>

      {/* Search/Filter */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <WidgetSkeleton key={i} variant="default" />
        ))}
      </div>
    </>
  )
}

/**
 * Detail Page Skeleton
 * For detail pages (student detail, textbook detail, etc.)
 */
function DetailPageSkeleton() {
  return (
    <>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <WidgetSkeleton key={i} variant="stats" />
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>

        {/* Tab Content */}
        <WidgetSkeleton variant="table" />
      </div>
    </>
  )
}

/**
 * Form Page Skeleton
 * For pages with forms (grades input, student registration, etc.)
 */
function FormPageSkeleton() {
  return (
    <>
      {/* Quick Actions (optional) */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Fields */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

          {/* Submit Button */}
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </>
  )
}

/**
 * Dashboard Page Skeleton
 * For dashboard pages with widgets
 */
function DashboardPageSkeleton() {
  return (
    <>
      {/* Welcome Banner */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <WidgetSkeleton key={i} variant="stats" />
        ))}
      </div>

      {/* Widgets */}
      <div className="grid gap-6 md:grid-cols-2">
        <WidgetSkeleton variant="list" />
        <WidgetSkeleton variant="chart" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WidgetSkeleton variant="calendar" />
        <WidgetSkeleton variant="table" />
      </div>
    </>
  )
}

/**
 * Section Skeleton
 *
 * Use within a page for individual section loading states.
 * Lighter weight than full PageSkeleton.
 *
 * @example
 * <Suspense fallback={<SectionSkeleton variant="stats" />}>
 *   <StatsWidget />
 * </Suspense>
 */
export function SectionSkeleton({
  variant = 'default',
  className,
}: {
  variant?: 'stats' | 'list' | 'chart' | 'table'
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <WidgetSkeleton variant={variant} />
    </div>
  )
}
