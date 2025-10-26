import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emptyState } from '@/lib/design-system'
import { Button } from '@ui/button'

export interface EmptyStateProps {
  /**
   * 아이콘 - LucideIcon 컴포넌트 또는 ReactNode
   * @example icon={Users}
   * @example icon={<Users className="h-12 w-12" />}
   */
  icon?: LucideIcon | ReactNode

  /**
   * 핵심 메시지 (제목)
   * @example "등록된 학생이 없습니다"
   */
  title: string

  /**
   * 부가 설명 (선택)
   * @example "새로운 학생을 등록하여 시작하세요"
   */
  description?: string

  /**
   * 액션 버튼 또는 커스텀 액션 영역
   * @example <Button onClick={handleCreate}>+ 학생 등록</Button>
   */
  action?: ReactNode

  /**
   * 컨테이너 스타일 variant
   * - default: 기본 스타일 (dashed border) - design-system의 emptyState 사용
   * - minimal: 최소한의 스타일 (border 없음)
   * - card: Card 스타일
   * @default "default"
   */
  variant?: 'default' | 'minimal' | 'card'

  /**
   * 커스텀 className
   */
  className?: string

  /**
   * 아이콘 색상 클래스
   * @default "text-muted-foreground"
   */
  iconClassName?: string
}

/**
 * EmptyState Component
 *
 * 빈 상태(데이터 없음)를 표시하는 컴포넌트입니다.
 * 사용자에게 친절한 안내와 다음 행동을 유도합니다.
 *
 * @example
 * ```tsx
 * // 첫 사용 (데이터가 아예 없을 때)
 * <EmptyState
 *   icon={Users}
 *   title="등록된 학생이 없습니다"
 *   description="새로운 학생을 등록하여 시작하세요"
 *   action={
 *     <Button onClick={() => router.push('/students/new')}>
 *       <Plus className="mr-2 h-4 w-4" />
 *       학생 등록
 *     </Button>
 *   }
 * />
 *
 * // 검색 결과 없음
 * <EmptyState
 *   icon={Search}
 *   title="검색 결과가 없습니다"
 *   description="다른 검색어로 다시 시도해보세요"
 *   action={
 *     <Button variant="outline" onClick={handleClearSearch}>
 *       검색 초기화
 *     </Button>
 *   }
 * />
 *
 * // 성공 상태 (모든 작업 완료)
 * <EmptyState
 *   icon={CheckCircle}
 *   title="모든 과제를 완료했습니다!"
 *   description="훌륭합니다. 새로운 과제가 등록되면 알려드리겠습니다."
 *   variant="minimal"
 *   iconClassName="text-green-500"
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  iconClassName,
}: EmptyStateProps) {
  const containerStyles = {
    default: emptyState.container,
    minimal: 'flex min-h-[400px] flex-col items-center justify-center p-8 text-center',
    card: 'flex min-h-[400px] flex-col items-center justify-center rounded-lg border bg-card shadow-sm p-8 text-center',
  }

  const defaultIconClassName = iconClassName || emptyState.icon

  // Check if icon is a LucideIcon component or ReactNode
  const isLucideIcon = typeof icon === 'function'

  return (
    <div className={cn(containerStyles[variant], className)}>
      {/* Icon */}
      {icon && (
        <div className={cn('mb-4', !isLucideIcon && defaultIconClassName)} aria-hidden="true">
          {isLucideIcon ? (
            // LucideIcon component
            (() => {
              const IconComponent = icon as LucideIcon
              return <IconComponent className={defaultIconClassName} />
            })()
          ) : (
            // ReactNode
            icon
          )}
        </div>
      )}

      {/* Title */}
      <h3 className={emptyState.title}>{title}</h3>

      {/* Description */}
      {description && <p className={emptyState.description}>{description}</p>}

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/**
 * EmptyStateIcon Component
 *
 * EmptyState와 함께 사용할 아이콘 래퍼입니다.
 * 일관된 크기와 스타일을 제공합니다.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<EmptyStateIcon icon={Users} />}
 *   title="등록된 학생이 없습니다"
 * />
 * ```
 */
export function EmptyStateIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon
  className?: string
}) {
  return <Icon className={cn('h-12 w-12', className)} />
}

/**
 * Common EmptyState variants for quick use
 */

/**
 * NoDataEmptyState
 *
 * 데이터가 전혀 없을 때 사용하는 표준 EmptyState입니다.
 *
 * @example
 * ```tsx
 * <NoDataEmptyState
 *   resourceName="학생"
 *   onCreateClick={() => router.push('/students/new')}
 *   createButtonText="학생 등록"
 * />
 * ```
 */
export function NoDataEmptyState({
  resourceName,
  onCreateClick,
  createButtonText,
  icon,
}: {
  resourceName: string
  onCreateClick?: () => void
  createButtonText?: string
  icon?: LucideIcon
}) {
  return (
    <EmptyState
      icon={icon}
      title={`등록된 ${resourceName}이(가) 없습니다`}
      description={`새로운 ${resourceName}을(를) 등록하여 시작하세요`}
      action={
        onCreateClick ? (
          <Button onClick={onCreateClick}>{createButtonText || `${resourceName} 등록`}</Button>
        ) : undefined
      }
    />
  )
}

/**
 * NoSearchResultsEmptyState
 *
 * 검색 결과가 없을 때 사용하는 표준 EmptyState입니다.
 *
 * @example
 * ```tsx
 * <NoSearchResultsEmptyState
 *   searchTerm={searchQuery}
 *   onClearSearch={handleClearSearch}
 * />
 * ```
 */
export function NoSearchResultsEmptyState({
  searchTerm,
  onClearSearch,
  icon,
}: {
  searchTerm?: string
  onClearSearch?: () => void
  icon?: LucideIcon
}) {
  return (
    <EmptyState
      icon={icon}
      title="검색 결과가 없습니다"
      description={
        searchTerm
          ? `"${searchTerm}"에 대한 검색 결과가 없습니다. 다른 검색어로 시도해보세요.`
          : '검색 결과가 없습니다. 다른 검색어로 시도해보세요.'
      }
      action={
        onClearSearch ? (
          <Button variant="outline" onClick={onClearSearch}>
            검색 초기화
          </Button>
        ) : undefined
      }
    />
  )
}

/**
 * NoFilterResultsEmptyState
 *
 * 필터 조건과 일치하는 결과가 없을 때 사용하는 표준 EmptyState입니다.
 *
 * @example
 * ```tsx
 * <NoFilterResultsEmptyState onClearFilters={handleClearFilters} />
 * ```
 */
export function NoFilterResultsEmptyState({
  onClearFilters,
  icon,
}: {
  onClearFilters?: () => void
  icon?: LucideIcon
}) {
  return (
    <EmptyState
      icon={icon}
      title="필터 조건과 일치하는 결과가 없습니다"
      description="다른 필터 조건으로 시도해보세요"
      action={
        onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            필터 초기화
          </Button>
        ) : undefined
      }
    />
  )
}
