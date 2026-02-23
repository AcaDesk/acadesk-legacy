'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { executeBatchDraft } from '@/app/actions/batch-drafts'
import {
  updateJobItemStatus,
  updateJobProgress,
  completeJob,
  getBatchJobDetail,
  retryFailedItems,
} from '@/app/actions/batch-jobs'
import type { BatchJobProgress, BatchJobItem, JobStatus } from '@/core/types/batch.types'

const BATCH_SIZE = 3

interface UseBatchExecutionOptions {
  draftId: string
  onComplete?: (jobId: string) => void
  executeItem: (item: BatchJobItem) => Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }>
}

export function useBatchExecution({ draftId, onComplete, executeItem }: UseBatchExecutionOptions) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<BatchJobProgress>({ total: 0, processed: 0, success: 0, failed: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const cancelRef = useRef(false)

  // Warn user before closing tab while running
  useEffect(() => {
    if (!isRunning) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isRunning])

  // Shared execution loop for items
  const runItems = useCallback(async (currentJobId: string, items: BatchJobItem[], currentProgress: BatchJobProgress) => {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (cancelRef.current) break

      const batch = items.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          await updateJobItemStatus(item.id, 'in_progress')
          try {
            const result = await executeItem(item)
            if (result.success) {
              await updateJobItemStatus(item.id, 'completed', result.data)
              return true
            } else {
              await updateJobItemStatus(item.id, 'failed', undefined, result.error, 'execution_error')
              return false
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : '알 수 없는 오류'
            await updateJobItemStatus(item.id, 'failed', undefined, msg, 'unexpected_error')
            return false
          }
        })
      )

      for (const r of results) {
        currentProgress.processed++
        if (r.status === 'fulfilled' && r.value) {
          currentProgress.success++
        } else {
          currentProgress.failed++
        }
      }

      setProgress({ ...currentProgress })
      await updateJobProgress(currentJobId, currentProgress)
    }

    return currentProgress
  }, [executeItem])

  const start = useCallback(async (idempotencyKey: string) => {
    setIsRunning(true)
    cancelRef.current = false

    // 1. Job 생성
    const execResult = await executeBatchDraft(draftId, idempotencyKey)
    if (!execResult.success || !execResult.data) {
      setIsRunning(false)
      return { success: false, error: execResult.error }
    }

    const createdJobId = execResult.data
    setJobId(createdJobId)

    // 2. Items 조회
    const detailResult = await getBatchJobDetail(createdJobId)
    if (!detailResult.success || !detailResult.data) {
      setIsRunning(false)
      return { success: false, error: detailResult.error }
    }

    const items = detailResult.data.items.filter((i) => i.status === 'pending')
    const total = items.length
    const currentProgress: BatchJobProgress = { total, processed: 0, success: 0, failed: 0 }
    setProgress({ ...currentProgress })
    await updateJobProgress(createdJobId, currentProgress)

    // 3. Batch 실행
    const finalProgress = await runItems(createdJobId, items, currentProgress)

    // 4. 완료 처리
    let finalStatus: JobStatus = 'succeeded'
    if (cancelRef.current) {
      finalStatus = 'canceled'
    } else if (finalProgress.failed > 0 && finalProgress.success > 0) {
      finalStatus = 'partial_failed'
    } else if (finalProgress.failed > 0 && finalProgress.success === 0) {
      finalStatus = 'failed'
    }

    await completeJob(createdJobId, finalStatus)
    setIsRunning(false)
    setIsComplete(true)
    onComplete?.(createdJobId)

    return { success: true, jobId: createdJobId }
  }, [draftId, runItems, onComplete])

  const retryFailed = useCallback(async () => {
    if (!jobId) return { success: false, error: 'Job ID가 없습니다.' }

    setIsRunning(true)
    setIsComplete(false)
    cancelRef.current = false

    // 1. 실패 아이템을 pending으로 리셋
    const retryResult = await retryFailedItems(jobId)
    if (!retryResult.success || !retryResult.data || retryResult.data.retryCount === 0) {
      setIsRunning(false)
      setIsComplete(true)
      return { success: false, error: retryResult.error || '재시도할 항목이 없습니다.' }
    }

    // 2. 리셋된 pending 아이템 조회
    const detailResult = await getBatchJobDetail(jobId)
    if (!detailResult.success || !detailResult.data) {
      setIsRunning(false)
      setIsComplete(true)
      return { success: false, error: detailResult.error }
    }

    const pendingItems = detailResult.data.items.filter((i) => i.status === 'pending')
    if (pendingItems.length === 0) {
      setIsRunning(false)
      setIsComplete(true)
      return { success: true }
    }

    // 3. 이전 진행 상태 기반으로 재시도 진행
    const previousSuccess = progress.success
    const retryProgress: BatchJobProgress = {
      total: previousSuccess + pendingItems.length,
      processed: previousSuccess,
      success: previousSuccess,
      failed: 0,
    }
    setProgress({ ...retryProgress })

    // 4. 재실행
    const finalProgress = await runItems(jobId, pendingItems, retryProgress)

    // 5. 완료 처리
    let finalStatus: JobStatus = 'succeeded'
    if (cancelRef.current) {
      finalStatus = 'canceled'
    } else if (finalProgress.failed > 0 && finalProgress.success > 0) {
      finalStatus = 'partial_failed'
    } else if (finalProgress.failed > 0 && finalProgress.success === 0) {
      finalStatus = 'failed'
    }

    await completeJob(jobId, finalStatus)
    setIsRunning(false)
    setIsComplete(true)
    onComplete?.(jobId)

    return { success: true }
  }, [jobId, progress.success, runItems, onComplete])

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return { jobId, progress, isRunning, isComplete, start, cancel, retryFailed }
}
