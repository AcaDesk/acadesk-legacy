import { Badge } from '@ui/badge'
import { FileBarChart, MessageSquare, Send } from 'lucide-react'
import type { BatchActionType } from '@/core/types/batch.types'

const TYPE_CONFIG: Record<BatchActionType, { label: string; icon: React.ElementType }> = {
  report: { label: '리포트', icon: FileBarChart },
  comment: { label: '코멘트', icon: MessageSquare },
  send: { label: '전송', icon: Send },
}

export function JobTypeBadge({ type }: { type: BatchActionType }) {
  const config = TYPE_CONFIG[type]
  if (!config) return <Badge variant="outline">{type}</Badge>

  const Icon = config.icon
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
