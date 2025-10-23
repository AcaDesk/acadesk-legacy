import { cn } from '@/lib/utils'
import { pageHeader } from '@/lib/design-system'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(pageHeader.container, className)}>
      <div className={pageHeader.content}>
        <h1 className={pageHeader.title}>{title}</h1>
        {description && <p className={pageHeader.description}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
