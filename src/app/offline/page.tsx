'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // 온라인 복구 시 1초 후 새로고침
      setTimeout(() => window.location.reload(), 1000)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="rounded-full bg-muted p-6">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">오프라인 상태입니다</h1>
        <p className="text-muted-foreground">
          인터넷 연결이 끊어져 이 페이지를 표시할 수 없습니다.
          <br />
          연결이 복구되면 자동으로 새로고침됩니다.
        </p>
      </div>
      {isOnline ? (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          연결 복구됨 — 새로고침 중...
        </div>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </button>
      )}
    </div>
  )
}
