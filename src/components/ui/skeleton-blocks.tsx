import { Skeleton } from '@ui/skeleton'
import { Card, CardContent, CardHeader } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { cn } from '@/lib/utils'

/**
 * Reusable Skeleton Block Components
 *
 * 재사용 가능한 스켈레톤 블록들입니다.
 * 이 블록들을 조합해서 페이지별 스켈레톤을 만들 수 있습니다.
 */

// ============================================================================
// Header Blocks
// ============================================================================

/**
 * 페이지 헤더 스켈레톤 (제목 + 설명)
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>
  )
}

/**
 * 상세 페이지 헤더 스켈레톤 (제목 + 설명 + 액션 버튼들)
 */
export function DetailHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

/**
 * 카드 헤더 스켈레톤
 */
export function CardHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

// ============================================================================
// Search & Filter Blocks
// ============================================================================

/**
 * 검색바 스켈레톤 (검색 입력 + 필터 버튼)
 */
export function SearchBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-4', className)}>
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

/**
 * 간단한 검색바 스켈레톤 (검색 입력만)
 */
export function SimpleSearchBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-4', className)}>
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
    </div>
  )
}

// ============================================================================
// Table Blocks
// ============================================================================

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

/**
 * 테이블 스켈레톤 (완전한 테이블 구조)
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * 간단한 테이블 스켈레톤 (카드 없이)
 */
export function SimpleTableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Card Blocks
// ============================================================================

/**
 * 기본 카드 스켈레톤
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}

/**
 * KPI/Stats 카드 스켈레톤
 */
export function StatsCardSkeleton({ className }: { className?: string }) {
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

/**
 * 컴팩트 카드 스켈레톤
 */
export function CompactCardSkeleton({ className }: { className?: string }) {
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

// ============================================================================
// List Blocks
// ============================================================================

export interface ListItemSkeletonProps {
  showAvatar?: boolean
  showAction?: boolean
  className?: string
}

/**
 * 리스트 아이템 스켈레톤 (아바타 + 텍스트 + 액션)
 */
export function ListItemSkeleton({
  showAvatar = true,
  showAction = true,
  className,
}: ListItemSkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-3 rounded-lg border', className)}>
      {showAvatar && <Skeleton className="h-12 w-12 rounded-full shrink-0" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      {showAction && <Skeleton className="h-8 w-20" />}
    </div>
  )
}

/**
 * 리스트 스켈레톤 (여러 아이템)
 */
export function ListSkeleton({
  items = 5,
  showAvatar = true,
  showAction = true,
  className,
}: {
  items?: number
  showAvatar?: boolean
  showAction?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} showAvatar={showAvatar} showAction={showAction} />
      ))}
    </div>
  )
}

// ============================================================================
// Form Blocks
// ============================================================================

/**
 * 폼 필드 스켈레톤 (라벨 + 입력)
 */
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/**
 * 폼 스켈레톤 (여러 필드 + 제출 버튼)
 */
export function FormSkeleton({
  fields = 5,
  className,
}: {
  fields?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// Grid Blocks
// ============================================================================

/**
 * 카드 그리드 스켈레톤
 */
export function CardGridSkeleton({
  items = 6,
  columns = 3,
  className,
}: {
  items?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Stats 카드 그리드 스켈레톤
 */
export function StatsGridSkeleton({
  items = 4,
  columns = 4,
  className,
}: {
  items?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ============================================================================
// Tab Blocks
// ============================================================================

/**
 * 탭 스켈레톤
 */
export function TabsSkeleton({
  tabs = 4,
  className,
}: {
  tabs?: number
  className?: string
}) {
  return (
    <div className={cn('flex gap-2 border-b', className)}>
      {Array.from({ length: tabs }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24" />
      ))}
    </div>
  )
}

// ============================================================================
// Misc Blocks
// ============================================================================

/**
 * 인라인 로딩 스켈레톤
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

/**
 * 빈 상태 스켈레톤 (아이콘 + 텍스트)
 */
export function EmptyStateSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 space-y-4', className)}>
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
  )
}
