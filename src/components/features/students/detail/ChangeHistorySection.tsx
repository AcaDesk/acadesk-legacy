'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { ArrowRight, History, Loader2 } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getStudentChangeLogs } from '@/app/actions/students/promotion'

interface ChangeLog {
  id: string
  change_type: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  promotion: '진급',
  school_transfer: '학교 전환',
  graduation: '졸업',
  manual_edit: '수동 수정',
}

const FIELD_LABELS: Record<string, string> = {
  grade: '학년',
  school: '학교',
}

const CHANGE_TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  promotion: 'default',
  school_transfer: 'secondary',
  graduation: 'outline',
  manual_edit: 'outline',
}

interface ChangeHistorySectionProps {
  studentId: string
}

export function ChangeHistorySection({ studentId }: ChangeHistorySectionProps) {
  const [logs, setLogs] = useState<ChangeLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const result = await getStudentChangeLogs(studentId)
      if (result.success && result.data) {
        setLogs(result.data as ChangeLog[])
      }
      setIsLoading(false)
    }
    fetchLogs()
  }, [studentId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">변경 이력이 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          변경 이력
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <div className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                {formatDate(new Date(log.changed_at), 'yyyy.MM.dd', { locale: ko })}
              </div>
              <Badge variant={CHANGE_TYPE_VARIANT[log.change_type] || 'outline'} className="shrink-0">
                {CHANGE_TYPE_LABELS[log.change_type] || log.change_type}
              </Badge>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-muted-foreground">{FIELD_LABELS[log.field_name] || log.field_name}</span>
                <span className="truncate">{log.old_value || '-'}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-medium truncate">{log.new_value || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
