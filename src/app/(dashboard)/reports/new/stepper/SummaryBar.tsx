'use client'

import { User, Calendar, Database, MessageSquare, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SelectedStudent } from './report-stepper-types'

interface SummaryBarProps {
  student: SelectedStudent | null
  periodLabel: string | null
  dataLoaded: boolean
  dataError: string | null
  warningCount: number
  commentProgress: number
}

export function SummaryBar({
  student,
  periodLabel,
  dataLoaded,
  dataError,
  warningCount,
  commentProgress,
}: SummaryBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg border bg-muted/30 text-sm overflow-x-auto">
      {/* Student */}
      <div className="flex items-center gap-1.5 shrink-0">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(student ? 'font-medium' : 'text-muted-foreground')}>
          {student ? `${student.name} (${student.studentCode})` : '미선택'}
        </span>
      </div>

      <Divider />

      {/* Period */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(periodLabel ? 'font-medium' : 'text-muted-foreground')}>
          {periodLabel || '미설정'}
        </span>
      </div>

      <Divider />

      {/* Data */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        {dataError ? (
          <span className="text-destructive font-medium">오류</span>
        ) : dataLoaded ? (
          warningCount > 0 ? (
            <span className="flex items-center gap-1 text-yellow-600 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              경고 {warningCount}건
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <Check className="h-3.5 w-3.5" />
              완료
            </span>
          )
        ) : (
          <span className="text-muted-foreground">미확인</span>
        )}
      </div>

      <Divider />

      {/* Comment */}
      <div className="flex items-center gap-1.5 shrink-0">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(commentProgress > 0 ? 'font-medium' : 'text-muted-foreground')}>
          {commentProgress}/4 작성
        </span>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-4 w-px bg-border shrink-0" />
}
