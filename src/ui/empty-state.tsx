import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emptyState } from '@/lib/design-system'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyState.container, className)}>
      {Icon && <Icon className={emptyState.icon} />}
      <h3 className={emptyState.title}>{title}</h3>
      {description && <p className={emptyState.description}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
