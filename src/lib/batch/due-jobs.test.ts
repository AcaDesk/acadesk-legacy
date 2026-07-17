import { describe, it, expect } from 'vitest'

import { isBatchJobDue } from './due-jobs'

const NOW = new Date('2026-07-17T09:00:00.000Z').getTime()

function scheduledJob(scheduledAt: string | undefined, status = 'queued') {
  return {
    status,
    job_params: { _schedule: { mode: 'scheduled', scheduledAt } },
  }
}

describe('isBatchJobDue', () => {
  it('running 상태는 예약 시각과 무관하게 항상 due (중단 재개 대상)', () => {
    expect(isBatchJobDue(scheduledJob('2099-01-01T00:00:00.000Z', 'running'), NOW)).toBe(true)
  })

  it('즉시 실행(now 모드) 잡은 due', () => {
    expect(isBatchJobDue({ status: 'queued', job_params: { _schedule: { mode: 'now' } } }, NOW)).toBe(true)
  })

  it('_schedule 정보가 없으면 due로 간주', () => {
    expect(isBatchJobDue({ status: 'queued', job_params: {} }, NOW)).toBe(true)
    expect(isBatchJobDue({ status: 'queued', job_params: null }, NOW)).toBe(true)
  })

  it('예약 시각이 도래하면 due', () => {
    expect(isBatchJobDue(scheduledJob('2026-07-17T08:59:59.000Z'), NOW)).toBe(true)
    expect(isBatchJobDue(scheduledJob('2026-07-17T09:00:00.000Z'), NOW)).toBe(true)
  })

  it('예약 시각이 미도래면 due 아님', () => {
    expect(isBatchJobDue(scheduledJob('2026-07-17T09:00:01.000Z'), NOW)).toBe(false)
    expect(isBatchJobDue(scheduledJob('2099-01-01T00:00:00.000Z'), NOW)).toBe(false)
  })

  it('scheduledAt 누락/손상 시 due로 간주 (잡이 영구히 묶이지 않도록)', () => {
    expect(isBatchJobDue(scheduledJob(undefined), NOW)).toBe(true)
    expect(isBatchJobDue(scheduledJob('not-a-date'), NOW)).toBe(true)
  })
})
