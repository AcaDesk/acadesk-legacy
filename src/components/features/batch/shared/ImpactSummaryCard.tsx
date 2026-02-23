'use client'

import { Card, CardContent } from '@ui/card'
import { FileBarChart, MessageSquare, Send, Users } from 'lucide-react'
import type { ReviewBatchDraftResult } from '@/core/types/batch.types'

interface ImpactSummaryCardProps {
  summary: ReviewBatchDraftResult['impactSummary']
}

export function ImpactSummaryCard({ summary }: ImpactSummaryCardProps) {
  const items = [
    { icon: Users, label: '총 대상', value: summary.totalTargets, suffix: '명' },
    { icon: FileBarChart, label: '리포트 생성', value: summary.estimatedCreations, suffix: '건' },
    { icon: MessageSquare, label: '코멘트 수정', value: summary.estimatedUpdates, suffix: '건' },
    { icon: Send, label: '메시지 전송', value: summary.estimatedSends, suffix: '건' },
  ].filter((item) => item.value > 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">
                  {item.value}
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">{item.suffix}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
