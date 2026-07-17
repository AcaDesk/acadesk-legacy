import type { BatchSchedule } from '@/core/types/batch.types'

export interface DueCheckJob {
  status: string
  job_params: unknown
}

/**
 * 배치 잡의 실행 시점 도래 여부를 판정한다.
 * - running: 중단된 실행 재개 대상이므로 항상 due
 * - queued + scheduled 모드: scheduledAt 도래 시에만 due
 * - 그 외(즉시 실행, 스케줄 정보 손상): due로 간주
 */
export function isBatchJobDue(job: DueCheckJob, now: number = Date.now()): boolean {
  if (job.status === 'running') return true
  const params = (job.job_params ?? {}) as Record<string, unknown>
  const schedule = (params._schedule ?? { mode: 'now' }) as BatchSchedule
  if (schedule.mode !== 'scheduled') return true
  if (!schedule.scheduledAt) return true
  const scheduledAt = new Date(schedule.scheduledAt).getTime()
  if (Number.isNaN(scheduledAt)) return true
  return scheduledAt <= now
}
