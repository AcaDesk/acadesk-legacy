'use client'

import { Progress } from '@ui/progress'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import type { BatchJobProgress } from '@/core/types/batch.types'

interface RunProgressPanelProps {
  progress: BatchJobProgress
  isRunning: boolean
}

export function RunProgressPanel({ progress, isRunning }: RunProgressPanelProps) {
  const percent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {isRunning ? '실행 중...' : '완료'}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {progress.processed} / {progress.total} ({percent}%)
        </span>
      </div>

      <Progress value={percent} className="h-3" />

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>성공: {progress.success}건</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>실패: {progress.failed}건</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>대기: {progress.total - progress.processed}건</span>
        </div>
      </div>
    </div>
  )
}
