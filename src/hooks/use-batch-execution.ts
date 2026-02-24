'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { executeBatchDraft } from '@/app/actions/batch/drafts'
import {
  getBatchJobDetail,
  retryFailedItems,
  executePendingJobItems,
  cancelJob,
} from '@/app/actions/batch/jobs'
import type { BatchJob, BatchJobProgress } from '@/core/types/batch.types'

interface UseBatchExecutionOptions {
  draftId: string
  initialJob?: BatchJob | null
  onComplete?: (jobId: string) => void
}

export function useBatchExecution({ draftId, initialJob, onComplete }: UseBatchExecutionOptions) {
  const [jobId, setJobId] = useState<string | null>(initialJob?.id ?? null)
  const [progress, setProgress] = useState<BatchJobProgress>(initialJob?.progress ?? { total: 0, processed: 0, success: 0, failed: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(Boolean(initialJob))
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const syncProgress = useCallback(async (currentJobId: string) => {
    const detailResult = await getBatchJobDetail(currentJobId)
    if (detailResult.success && detailResult.data) {
      setProgress(detailResult.data.job.progress)
    }
  }, [])

  const startPolling = useCallback((currentJobId: string) => {
    stopPolling()
    pollRef.current = setInterval(() => {
      void syncProgress(currentJobId)
    }, 1000)
  }, [stopPolling, syncProgress])

  // Warn user before closing tab while running
  useEffect(() => {
    if (!isRunning) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isRunning])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  useEffect(() => {
    if (!jobId) return
    void syncProgress(jobId)
  }, [jobId, syncProgress])

  const runJob = useCallback(async (currentJobId: string) => {
    setIsRunning(true)
    setIsComplete(false)
    await syncProgress(currentJobId)
    startPolling(currentJobId)

    const runResult = await executePendingJobItems(currentJobId)
    stopPolling()
    if (!runResult.success || !runResult.data) {
      setIsRunning(false)
      setIsComplete(true)
      await syncProgress(currentJobId)
      return { success: false as const, error: runResult.error }
    }

    setProgress(runResult.data.progress)
    setIsRunning(false)
    setIsComplete(true)
    if (runResult.data.status === 'queued' || runResult.data.status === 'running') {
      return { success: true as const, jobId: currentJobId, queued: true as const }
    }
    onComplete?.(currentJobId)
    return { success: true as const, jobId: currentJobId }
  }, [onComplete, startPolling, stopPolling, syncProgress])

  const start = useCallback(async (idempotencyKey: string, runImmediately = true) => {
    setIsRunning(true)
    setIsComplete(false)

    const execResult = await executeBatchDraft(draftId, idempotencyKey)
    if (!execResult.success || !execResult.data) {
      setIsRunning(false)
      return { success: false, error: execResult.error }
    }

    const createdJobId = execResult.data
    setJobId(createdJobId)
    await syncProgress(createdJobId)
    if (!runImmediately) {
      setIsRunning(false)
      setIsComplete(true)
      return { success: true as const, jobId: createdJobId, queued: true as const }
    }
    return runJob(createdJobId)
  }, [draftId, runJob, syncProgress])

  const retryFailed = useCallback(async () => {
    if (!jobId) return { success: false, error: 'Job ID가 없습니다.' }

    setIsRunning(true)
    setIsComplete(false)

    const retryResult = await retryFailedItems(jobId)
    if (!retryResult.success || !retryResult.data || retryResult.data.retryCount === 0) {
      setIsRunning(false)
      setIsComplete(true)
      return { success: false, error: retryResult.error || '재시도할 항목이 없습니다.' }
    }

    const runResult = await runJob(jobId)
    if (!runResult.success) {
      return { success: false, error: runResult.error }
    }
    if ('queued' in runResult && runResult.queued) {
      return { success: false, error: '예약된 작업은 지정된 시간 이후 실행됩니다.' }
    }
    return { success: true }
  }, [jobId, runJob])

  const resume = useCallback(async () => {
    if (!jobId) return { success: false, error: 'Job ID가 없습니다.' }
    const result = await runJob(jobId)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    if ('queued' in result && result.queued) {
      return { success: false, error: '아직 예약 시간이 도래하지 않았습니다.' }
    }
    return { success: true }
  }, [jobId, runJob])

  const cancel = useCallback(async () => {
    if (!jobId) return { success: false, error: 'Job ID가 없습니다.' }
    const result = await cancelJob(jobId)
    await syncProgress(jobId)
    if (!result.success) return { success: false, error: result.error }
    setIsRunning(false)
    setIsComplete(true)
    return { success: true }
  }, [jobId, syncProgress])

  return { jobId, progress, isRunning, isComplete, start, cancel, retryFailed, resume }
}
