'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getBatchJobDetail, cancelJob, retryFailedItems, executePendingJobItems } from '@/app/actions/batch-jobs'
import { JobProgressHeader } from './JobProgressHeader'
import { JobErrorGroupList } from './JobErrorGroupList'
import { RunResultActions } from '@/components/features/batch/shared/RunResultActions'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react'
import type { BatchJob, BatchJobItem } from '@/core/types/batch.types'

interface JobDetailContentProps {
  initialJob: BatchJob
  initialItems: BatchJobItem[]
}

const STATUS_ICON = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  failed: XCircle,
  skipped: MinusCircle,
} as const

export function JobDetailContent({ initialJob, initialItems }: JobDetailContentProps) {
  const { toast } = useToast()
  const [job, setJob] = useState(initialJob)
  const [items, setItems] = useState(initialItems)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const refresh = async () => {
    const result = await getBatchJobDetail(job.id)
    if (result.success && result.data) {
      setJob(result.data.job)
      setItems(result.data.items)
    }
  }

  const handleCancel = async () => {
    setCanceling(true)
    const result = await cancelJob(job.id)
    if (result.success) {
      toast({ title: '작업이 취소되었습니다.' })
      await refresh()
    } else {
      toast({ title: '취소 실패', description: result.error ?? '', variant: 'destructive' })
    }
    setCanceling(false)
    setCancelOpen(false)
  }

  const summary = {
    total: items.length,
    success: items.filter((i) => i.status === 'completed').length,
    failed: items.filter((i) => i.status === 'failed').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
  }

  return (
    <div className="space-y-6">
      <JobProgressHeader job={job} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '총 대상', value: summary.total, color: 'text-foreground' },
          { label: '성공', value: summary.success, color: 'text-green-600' },
          { label: '실패', value: summary.failed, color: 'text-red-600' },
          { label: '건너뜀', value: summary.skipped, color: 'text-muted-foreground' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <JobErrorGroupList items={items} />

      <div className="flex gap-2">
        <RunResultActions
          jobId={job.id}
          failedCount={summary.failed}
          onRetry={async () => {
            const result = await retryFailedItems(job.id)
            if (!result.success || !result.data) {
              return { success: false, error: result.error }
            }

            if (result.data.retryCount === 0) {
              await refresh()
              return { success: false, error: '재시도할 항목이 없습니다.' }
            }

            const executeResult = await executePendingJobItems(job.id)
            await refresh()
            if (!executeResult.success) {
              return { success: false, error: executeResult.error }
            }

            toast({ title: `${result.data.retryCount}건 재실행 완료` })
            return { success: true }
          }}
        />
        {(job.status === 'queued' || job.status === 'running') && (
          <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
            작업 취소
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">항목 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {items.map((item) => {
              const Icon = STATUS_ICON[item.status] ?? Clock
              return (
                <div key={item.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${
                    item.status === 'completed' ? 'text-green-500' :
                    item.status === 'failed' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`} />
                  <span className="font-medium min-w-[100px]">{item.target_name ?? item.target_id}</span>
                  {item.error_message && (
                    <span className="text-muted-foreground truncate">{item.error_message}</span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="작업을 취소하시겠습니까?"
        description="대기 중인 항목은 건너뛰기 처리됩니다."
        confirmText="취소"
        variant="destructive"
        isLoading={canceling}
        onConfirm={handleCancel}
      />
    </div>
  )
}
