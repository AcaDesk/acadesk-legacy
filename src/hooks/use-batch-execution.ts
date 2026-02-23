'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { executeBatchDraft } from '@/app/actions/batch-drafts'
import {
  getBatchJobDetail,
  retryFailedItems,
  executePendingJobItems,
  cancelJob,
} from '@/app/actions/batch-jobs'
import type { BatchJobProgress } from '@/core/types/batch.types'

interface UseBatchExecutionOptions {
  draftId: string
  onComplete?: (jobId: string) => void
}

export function useBatchExecution({ draftId, onComplete }: UseBatchExecutionOptions) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<BatchJobProgress>({ total: 0, processed: 0, success: 0, failed: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
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

  const start = useCallback(async (idempotencyKey: string) => {
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
    startPolling(createdJobId)

    const runResult = await executePendingJobItems(createdJobId)
    stopPolling()
    if (!runResult.success || !runResult.data) {
      setIsRunning(false)
      setIsComplete(true)
      await syncProgress(createdJobId)
      return { success: false, error: runResult.error }
    }

    setProgress(runResult.data.progress)
    setIsRunning(false)
    setIsComplete(true)
    onComplete?.(createdJobId)
    return { success: true, jobId: createdJobId }
  }, [draftId, onComplete, startPolling, stopPolling, syncProgress])

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

    await syncProgress(jobId)
    startPolling(jobId)
    const runResult = await executePendingJobItems(jobId)
    stopPolling()
    if (!runResult.success || !runResult.data) {
      setIsRunning(false)
      setIsComplete(true)
      await syncProgress(jobId)
      return { success: false, error: runResult.error }
    }

    setProgress(runResult.data.progress)
    setIsRunning(false)
    setIsComplete(true)
    onComplete?.(jobId)
    return { success: true }
  }, [jobId, onComplete, startPolling, stopPolling, syncProgress])

  const cancel = useCallback(async () => {
    if (!jobId) return { success: false, error: 'Job ID가 없습니다.' }
    const result = await cancelJob(jobId)
    await syncProgress(jobId)
    if (!result.success) return { success: false, error: result.error }
    setIsRunning(false)
    setIsComplete(true)
    return { success: true }
  }, [jobId, syncProgress])

  return { jobId, progress, isRunning, isComplete, start, cancel, retryFailed }
}
