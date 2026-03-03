'use client'

import { WifiOff, Loader2 } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'

export function OfflineIndicator() {
  const { isOnline, isSyncing } = useNetworkStatus()

  if (isOnline && !isSyncing) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground">
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          오프라인 — 변경 사항은 연결 복구 후 자동 동기화됩니다
        </>
      ) : (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          동기화 중...
        </>
      )}
    </div>
  )
}
