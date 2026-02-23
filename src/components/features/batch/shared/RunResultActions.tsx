'use client'

import { useState } from 'react'
import { Button } from '@ui/button'
import { useToast } from '@/hooks/use-toast'
import { getFailedItemsCsv } from '@/app/actions/batch-jobs'
import { RefreshCw, Download, Loader2 } from 'lucide-react'

interface RunResultActionsProps {
  jobId: string
  failedCount: number
  onRetry?: () => Promise<{ success: boolean; error?: string | null }>
}

export function RunResultActions({ jobId, failedCount, onRetry }: RunResultActionsProps) {
  const { toast } = useToast()
  const [retrying, setRetrying] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    setRetrying(true)
    const result = await onRetry()
    if (!result.success) {
      toast({ title: '재시도 실패', description: result.error ?? '', variant: 'destructive' })
    }
    setRetrying(false)
  }

  const handleDownloadCsv = async () => {
    setDownloading(true)
    const result = await getFailedItemsCsv(jobId)
    if (result.success && result.data) {
      const blob = new Blob(['\uFEFF' + result.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-failed-${jobId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      toast({ title: 'CSV 다운로드 실패', description: result.error ?? '', variant: 'destructive' })
    }
    setDownloading(false)
  }

  if (failedCount === 0) return null

  return (
    <div className="flex gap-2">
      {onRetry && (
        <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
          {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          실패건 재시도 ({failedCount}건)
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleDownloadCsv} disabled={downloading}>
        {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        실패 목록 CSV
      </Button>
    </div>
  )
}
