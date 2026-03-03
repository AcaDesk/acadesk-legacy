'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  subscribeNetworkStatus,
  isOnline as getIsOnline,
} from '@/lib/pwa/network-status'
import { syncPendingMutations, getIsSyncing } from '@/lib/pwa/offline-queue'
import { useState } from 'react'

function subscribe(callback: () => void) {
  return subscribeNetworkStatus(() => callback())
}

function getSnapshot() {
  return getIsOnline()
}

function getServerSnapshot() {
  return true
}

export function useNetworkStatus() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number
    failed: number
  } | null>(null)

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || getIsSyncing()) return
    setIsSyncing(true)
    try {
      const result = await syncPendingMutations()
      setLastSyncResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // 온라인 복구 시 자동 동기화
  useEffect(() => {
    if (online) {
      triggerSync()
    }
  }, [online, triggerSync])

  return { isOnline: online, isSyncing, lastSyncResult, triggerSync }
}
