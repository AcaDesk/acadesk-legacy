import { Badge } from '@ui/badge'
import type { JobStatus } from '@/core/types/batch.types'

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: '대기', variant: 'secondary' },
  running: { label: '실행 중', variant: 'default' },
  partial_failed: { label: '일부 실패', variant: 'destructive' },
  succeeded: { label: '성공', variant: 'default' },
  failed: { label: '실패', variant: 'destructive' },
  canceled: { label: '취소됨', variant: 'outline' },
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
