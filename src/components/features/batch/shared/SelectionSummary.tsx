'use client'

import { Card, CardContent } from '@ui/card'
import { Users, UserCheck } from 'lucide-react'

interface SelectionSummaryProps {
  totalCount: number
  selectedCount: number
}

export function SelectionSummary({ totalCount, selectedCount }: SelectionSummaryProps) {
  return (
    <div className="flex gap-4">
      <Card className="flex-1">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-muted p-2">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">전체 학생</p>
            <p className="text-2xl font-bold">{totalCount}명</p>
          </div>
        </CardContent>
      </Card>
      <Card className="flex-1">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">선택됨</p>
            <p className="text-2xl font-bold text-primary">{selectedCount}명</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
