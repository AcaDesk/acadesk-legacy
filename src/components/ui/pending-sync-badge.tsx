'use client'

import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'

interface PendingSyncBadgeProps {
  tenantId?: string
}

export function PendingSyncBadge({ tenantId }: PendingSyncBadgeProps) {
  const { pendingCount } = useOfflineQueue(tenantId)
  const { isOnline, isSyncing, triggerSync } = useNetworkStatus()

  if (pendingCount === 0 && !isSyncing) return null

  return (
    <button
      onClick={isOnline && !isSyncing ? triggerSync : undefined}
      disabled={!isOnline || isSyncing}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
      title={
        isSyncing
          ? '동기화 중...'
          : isOnline
            ? '클릭하여 수동 동기화'
            : '오프라인 상태'
      }
    >
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
      ) : isOnline ? (
        <Cloud className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <CloudOff className="h-3.5 w-3.5 text-amber-500" />
      )}
      {pendingCount > 0 && (
        <span>{pendingCount}건 대기</span>
      )}
    </button>
  )
}
