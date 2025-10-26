import { Card, CardContent, CardHeader } from '@ui/card'
import { cn } from '@/lib/utils'
import { WidgetSkeleton } from './widget-skeleton'
import {
  PageHeaderSkeleton,
  DetailHeaderSkeleton,
  CardHeaderSkeleton,
  SearchBarSkeleton,
  SimpleSearchBarSkeleton,
  TableSkeleton,
  CardGridSkeleton,
  StatsGridSkeleton,
  FormSkeleton,
  TabsSkeleton,
  ListSkeleton,
  CardSkeleton,
} from './skeleton-blocks'

export interface PageSkeletonProps {
  variant?:
    | 'list'
    | 'grid'
    | 'detail'
    | 'form'
    | 'dashboard'
    | 'table'
    | 'calendar'
    | 'stats'
    | 'import'
    | 'settings'
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
      <PageHeaderSkeleton />

      {/* Content by variant */}
      {variant === 'list' && <ListPageSkeleton />}
      {variant === 'grid' && <GridPageSkeleton />}
      {variant === 'detail' && <DetailPageSkeleton />}
      {variant === 'form' && <FormPageSkeleton />}
      {variant === 'dashboard' && <DashboardPageSkeleton />}
      {variant === 'table' && <TablePageSkeleton />}
      {variant === 'calendar' && <CalendarPageSkeleton />}
      {variant === 'stats' && <StatsPageSkeleton />}
      {variant === 'import' && <ImportPageSkeleton />}
      {variant === 'settings' && <SettingsPageSkeleton />}
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
      <SearchBarSkeleton />
      <Card>
        <CardHeader>
          <CardSkeleton />
        </CardHeader>
        <CardContent>
          <ListSkeleton items={8} />
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
      <StatsGridSkeleton items={3} columns={3} />
      <SimpleSearchBarSkeleton />
      <CardGridSkeleton items={6} columns={3} />
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
      <DetailHeaderSkeleton />
      <StatsGridSkeleton items={3} columns={3} />
      <div className="space-y-4">
        <TabsSkeleton tabs={4} />
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
      <CardGridSkeleton items={2} columns={2} />
      <Card>
        <CardHeader>
          <CardHeaderSkeleton />
        </CardHeader>
        <CardContent>
          <FormSkeleton fields={5} />
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
      <Card>
        <CardContent className="p-6">
          <CardHeaderSkeleton />
        </CardContent>
      </Card>
      <StatsGridSkeleton items={4} columns={4} />
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
 * Table Page Skeleton
 * For pages with primarily a data table (attendance, grades list, etc.)
 */
function TablePageSkeleton() {
  return (
    <>
      <SearchBarSkeleton />
      <Card>
        <CardHeader>
          <CardHeaderSkeleton />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} columns={6} />
        </CardContent>
      </Card>
    </>
  )
}

/**
 * Calendar Page Skeleton
 * For calendar/schedule pages
 */
function CalendarPageSkeleton() {
  return (
    <>
      <SimpleSearchBarSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WidgetSkeleton variant="calendar" />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardHeaderSkeleton />
            </CardHeader>
            <CardContent>
              <ListSkeleton items={5} showAvatar={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

/**
 * Stats Page Skeleton
 * For statistics/analytics pages
 */
function StatsPageSkeleton() {
  return (
    <>
      <StatsGridSkeleton items={4} columns={4} />
      <div className="grid gap-6 md:grid-cols-2">
        <WidgetSkeleton variant="chart" />
        <WidgetSkeleton variant="chart" />
      </div>
      <WidgetSkeleton variant="table" />
    </>
  )
}

/**
 * Import Page Skeleton
 * For data import/upload pages
 */
function ImportPageSkeleton() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardHeaderSkeleton />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed rounded-lg p-12">
            <div className="flex flex-col items-center space-y-4">
              <CardHeaderSkeleton />
            </div>
          </div>
          <FormSkeleton fields={3} />
        </CardContent>
      </Card>
    </>
  )
}

/**
 * Settings Page Skeleton
 * For settings/configuration pages
 */
function SettingsPageSkeleton() {
  return (
    <>
      <TabsSkeleton tabs={5} />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardHeaderSkeleton />
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={4} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardHeaderSkeleton />
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={3} />
          </CardContent>
        </Card>
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
  variant = 'list',
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
