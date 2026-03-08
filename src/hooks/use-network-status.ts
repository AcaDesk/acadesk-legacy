'use client'

import { useCallback, useEffect, useSyncExternalStore, useRef } from 'react'
import {
  subscribeNetworkStatus,
  isOnline as getIsOnline,
} from '@/lib/pwa/network-status'
import { syncPendingMutations, getIsSyncing } from '@/lib/pwa/offline-queue'
import { useState } from 'react'

const OFFLINE_DEBOUNCE_MS = 1500

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
  const [debouncedOnline, setDebouncedOnline] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 오프라인 전환은 디바운스, 온라인 복구는 즉시 반영
  useEffect(() => {
    if (online) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setDebouncedOnline(true)
    } else {
      timerRef.current = setTimeout(() => {
        setDebouncedOnline(false)
      }, OFFLINE_DEBOUNCE_MS)
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [online])

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

  // 온라인 복구 시 자동 동기화 (초기 마운트 제외)
  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (online) {
      triggerSync()
    }
  }, [online, triggerSync])

  return { isOnline: debouncedOnline, isSyncing, lastSyncResult, triggerSync }
}
