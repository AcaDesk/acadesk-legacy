'use client'

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@ui/button'
import { Progress } from '@ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'

interface SendProgressPanelProps {
  current: number
  total: number
  successCount: number
  failCount: number
  currentStudentName?: string
  isComplete: boolean
  onCancel: () => void
  onDone: () => void
}

export function SendProgressPanel({
  current,
  total,
  successCount,
  failCount,
  currentStudentName,
  isComplete,
  onCancel,
  onDone,
}: SendProgressPanelProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isComplete ? '전송 완료' : '전송 진행 중...'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isComplete ? '전체 처리 완료' : `처리 중... ${current} / ${total}`}
            </span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {currentStudentName && !isComplete && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentStudentName} 처리 중...
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">성공 {successCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">실패 {failCount}건</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {isComplete ? (
            <Button onClick={onDone}>확인</Button>
          ) : (
            <Button variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
