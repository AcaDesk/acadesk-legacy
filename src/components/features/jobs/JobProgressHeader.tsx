import { Card, CardContent } from '@ui/card'
import { Progress } from '@ui/progress'
import { JobStatusBadge } from './JobStatusBadge'
import { JobTypeBadge } from './JobTypeBadge'
import { Clock, Timer } from 'lucide-react'
import type { BatchJob } from '@/core/types/batch.types'

interface JobProgressHeaderProps {
  job: BatchJob
}

function formatDuration(start: string, end: string | null): string {
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const diff = Math.round((e - s) / 1000)
  if (diff < 60) return `${diff}초`
  const min = Math.floor(diff / 60)
  const sec = diff % 60
  return `${min}분 ${sec}초`
}

export function JobProgressHeader({ job }: JobProgressHeaderProps) {
  const progress = job.progress
  const percent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{job.job_name ?? '일괄 작업'}</h2>
            <JobTypeBadge type={job.action_type} />
            <JobStatusBadge status={job.status} />
          </div>
        </div>

        <Progress value={percent} className="h-2" />

        <div className="flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>시작: {job.started_at ? new Date(job.started_at).toLocaleString('ko-KR') : '-'}</span>
          </div>
          {job.started_at && (
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              <span>소요: {formatDuration(job.started_at, job.completed_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
