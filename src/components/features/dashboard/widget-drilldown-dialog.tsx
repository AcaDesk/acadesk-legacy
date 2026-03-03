'use client'

import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog'
import { Badge } from '@ui/badge'
import { Skeleton } from '@ui/skeleton'
import { cn } from '@/lib/utils'
import {
  getDrilldownData,
  type DrilldownWidgetId,
  type ClassStudentCount,
  type StudentAttendance,
  type ExamScoreEntry,
  type StudentCompletionRate,
} from '@/app/actions/dashboard-drilldown'
import type { KPIPeriod } from '@/app/actions/dashboard-kpi'

interface WidgetDrilldownDialogProps {
  widgetId: DrilldownWidgetId
  period: KPIPeriod
  open: boolean
  onClose: () => void
}

const WIDGET_TITLES: Record<DrilldownWidgetId, string> = {
  'kpi-total-students': '전체 학생 상세',
  'kpi-attendance-rate': '출석 현황 상세',
  'kpi-average-score': '성적 상세',
  'kpi-completion-rate': '과제 완료율 상세',
}

const PERIOD_LABELS: Record<KPIPeriod, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
}

function DrilldownSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function TotalStudentsDrilldown({ data }: {
  data: { classCounts: ClassStudentCount[]; newStudentsCount: number }
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/50">
        <span className="text-sm font-medium">신규 등록</span>
        <Badge variant="secondary">{data.newStudentsCount}명</Badge>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">반별 학생 수</p>
        {data.classCounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다</p>
        ) : (
          data.classCounts.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
              <span className="text-sm">{c.class_name}</span>
              <span className="text-sm font-semibold">{c.student_count}명</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AttendanceDrilldown({ attendanceList }: { attendanceList: StudentAttendance[] | undefined }) {
  if (!attendanceList || attendanceList.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">출석 데이터가 없습니다</p>
  }

  const statusConfig = {
    present: { label: '출석', className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
    late: { label: '지각', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' },
    absent: { label: '결석', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
    'no-record': { label: '미입력', className: 'bg-muted text-muted-foreground' },
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {attendanceList.map((s, i) => {
        const config = statusConfig[s.status]
        return (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{s.student_name}</span>
              {s.grade && <span className="text-xs text-muted-foreground">{s.grade}</span>}
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.className)}>
              {config.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ScoreDrilldown({ scoreList }: { scoreList: ExamScoreEntry[] | undefined }) {
  if (!scoreList || scoreList.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">성적 데이터가 없습니다</p>
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {scoreList.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
            <span className="text-sm font-medium">{s.student_name}</span>
            <span className="text-xs text-muted-foreground">{s.exam_count}회</span>
          </div>
          <span className={cn(
            'text-sm font-bold',
            s.average_score >= 90 ? 'text-green-600 dark:text-green-400'
              : s.average_score >= 70 ? 'text-primary'
              : 'text-destructive'
          )}>
            {s.average_score}점
          </span>
        </div>
      ))}
    </div>
  )
}

function CompletionDrilldown({ completionList }: { completionList: StudentCompletionRate[] | undefined }) {
  if (!completionList || completionList.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">과제 데이터가 없습니다</p>
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {completionList.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{s.student_name}</span>
            <span className="text-xs text-muted-foreground">{s.completed}/{s.total}개</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  s.rate >= 80 ? 'bg-green-500' : s.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${s.rate}%` }}
              />
            </div>
            <span className={cn(
              'text-sm font-bold w-10 text-right',
              s.rate >= 80 ? 'text-green-600 dark:text-green-400'
                : s.rate >= 50 ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-destructive'
            )}>
              {s.rate}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function WidgetDrilldownDialog({ widgetId, period, open, onClose }: WidgetDrilldownDialogProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['drilldown', widgetId, period],
    queryFn: () => getDrilldownData(widgetId, period),
    enabled: open,
    staleTime: 60_000,
  })

  const drilldownData = result?.data

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {WIDGET_TITLES[widgetId]}
            <Badge variant="outline" className="text-xs font-normal">
              {PERIOD_LABELS[period]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {isLoading ? (
            <DrilldownSkeleton />
          ) : !result?.success || !drilldownData ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {result?.error || '데이터를 불러올 수 없습니다'}
            </p>
          ) : widgetId === 'kpi-total-students' && drilldownData.classCounts ? (
            <TotalStudentsDrilldown
              data={{
                classCounts: drilldownData.classCounts,
                newStudentsCount: drilldownData.newStudentsCount ?? 0,
              }}
            />
          ) : widgetId === 'kpi-attendance-rate' ? (
            <AttendanceDrilldown attendanceList={drilldownData.attendanceList} />
          ) : widgetId === 'kpi-average-score' ? (
            <ScoreDrilldown scoreList={drilldownData.scoreList} />
          ) : widgetId === 'kpi-completion-rate' ? (
            <CompletionDrilldown completionList={drilldownData.completionList} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
