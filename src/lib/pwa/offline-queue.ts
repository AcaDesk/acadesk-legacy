import { nanoid } from 'nanoid'
import {
  addToMutationQueue,
  getPendingMutations,
  removeMutation,
  updateMutationRetry,
  type QueuedMutation,
} from './indexeddb'

const MAX_RETRIES = 5

// ============================================================================
// Enqueue
// ============================================================================

export async function enqueueMutation(
  tenantId: string,
  type: QueuedMutation['type'],
  payload: Record<string, unknown>
): Promise<string> {
  const id = nanoid()
  await addToMutationQueue({
    id,
    tenantId,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  })
  return id
}

// ============================================================================
// Sync Engine
// ============================================================================

let isSyncing = false

export async function syncPendingMutations(
  tenantId?: string
): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 }
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  isSyncing = true
  let synced = 0
  let failed = 0

  try {
    const mutations = await getPendingMutations(tenantId)
    // createdAt 순으로 정렬 (FIFO)
    mutations.sort((a, b) => a.createdAt - b.createdAt)

    for (const mutation of mutations) {
      if (mutation.retryCount >= MAX_RETRIES) {
        // 최대 재시도 초과 — 제거
        await removeMutation(mutation.id)
        failed++
        continue
      }

      try {
        await executeMutation(mutation)
        await removeMutation(mutation.id)
        synced++
      } catch {
        await updateMutationRetry(mutation.id, mutation.retryCount + 1)
        failed++
      }
    }
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}

export function getIsSyncing(): boolean {
  return isSyncing
}

// ============================================================================
// Mutation Executor
// ============================================================================

async function executeMutation(mutation: QueuedMutation): Promise<void> {
  const { type, payload } = mutation

  switch (type) {
    case 'saveAttendance': {
      const { saveAttendance } = await import('@/app/actions/attendance')
      const result = await saveAttendance(
        payload as Parameters<typeof saveAttendance>[0]
      )
      if (!result.success) throw new Error(result.error)
      break
    }
    case 'cancelAttendance': {
      const { cancelAttendance } = await import('@/app/actions/attendance')
      const result = await cancelAttendance(
        payload as Parameters<typeof cancelAttendance>[0]
      )
      if (!result.success) throw new Error(result.error)
      break
    }
    case 'toggleTodoComplete': {
      const { toggleTodoComplete } = await import('@/app/actions/kiosk')
      const p = payload as {
        todoId: string
        studentId: string
        tenantId: string
        currentStatus: boolean
      }
      const result = await toggleTodoComplete(
        p.todoId,
        p.studentId,
        p.tenantId,
        p.currentStatus
      )
      if (!result.success) throw new Error(result.error)
      break
    }
  }
}
