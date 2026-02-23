'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { FileBarChart, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BatchActionType } from '@/core/types/batch.types'

interface ActionCardGroupProps {
  selected: BatchActionType | null
  onSelect: (action: BatchActionType) => void
  targetCount: number
}

const ACTION_CARDS: {
  type: BatchActionType
  icon: React.ElementType
  title: string
  description: string
  estimatePerItem: string
}[] = [
  {
    type: 'report',
    icon: FileBarChart,
    title: '리포트 생성',
    description: '학생별 월간 학습 리포트를 일괄 생성합니다. 출석, 성적, 과제 현황이 포함됩니다.',
    estimatePerItem: '약 2초/건',
  },
  {
    type: 'comment',
    icon: MessageSquare,
    title: '코멘트 등록',
    description: '리포트에 강사 코멘트를 일괄 등록합니다. 템플릿을 사용하거나 직접 작성할 수 있습니다.',
    estimatePerItem: '약 1초/건',
  },
  {
    type: 'send',
    icon: Send,
    title: '메시지 전송',
    description: '보호자에게 리포트 링크가 포함된 메시지를 일괄 전송합니다. SMS, LMS, 카카오를 지원합니다.',
    estimatePerItem: '약 1초/건',
  },
]

export function ActionCardGroup({ selected, onSelect, targetCount }: ActionCardGroupProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {ACTION_CARDS.map((card) => {
        const Icon = card.icon
        const isSelected = selected === card.type
        const estimatedTime = Math.ceil(targetCount * 2)

        return (
          <Card
            key={card.type}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              isSelected
                ? 'border-primary ring-2 ring-primary/20'
                : 'hover:border-muted-foreground/30'
            )}
            onClick={() => onSelect(card.type)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', isSelected ? 'bg-primary/10' : 'bg-muted')}>
                  <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <CardTitle className="text-base">{card.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{card.description}</CardDescription>
              <div className="text-xs text-muted-foreground">
                <span>{card.estimatePerItem}</span>
                {targetCount > 0 && (
                  <span className="ml-2">(예상 총 {estimatedTime}초)</span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
