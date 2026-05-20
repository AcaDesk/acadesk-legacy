'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useBatchExecution } from '@/hooks/use-batch-execution'
import { RunProgressPanel } from '../shared/RunProgressPanel'
import { RunResultActions } from '../shared/RunResultActions'
import { Button } from '@ui/button'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { Rocket } from 'lucide-react'
import type { BatchDraft, BatchJob } from '@/core/types/batch.types'

interface StepRunProps {
  draftId: string
  draft: BatchDraft
  initialJob?: BatchJob | null
}

export function StepRun({ draftId, draft, initialJob = null }: StepRunProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [started, setStarted] = useState(Boolean(initialJob))

  const { jobId, progress, isRunning, isComplete, start, cancel, retryFailed, resume } = useBatchExecution({
    draftId,
    initialJob,
    onComplete: (completedJobId) => {
      toast({ title: '작업이 종료되었습니다.' })
      // 3초 후 자동 이동
      setTimeout(() => router.push(`/reports/jobs/${completedJobId}`), 3000)
    },
  })

  const scheduledAt = draft.schedule?.mode === 'scheduled' ? draft.schedule.scheduledAt : undefined
  const isScheduledFuture =
    Boolean(scheduledAt) && new Date(scheduledAt as string).getTime() > Date.now()
  const hasPendingWork = progress.total > 0 && progress.processed < progress.total

  const handleExecute = async () => {
    setConfirmOpen(false)
    setStarted(true)
    const idempotencyKey = crypto.randomUUID()
    const result = await start(idempotencyKey, !isScheduledFuture)
    if (!result.success) {
      toast({ title: '실행 실패', description: result.error ?? '', variant: 'destructive' })
      setStarted(false)
      return
    }
    if ('queued' in result && result.queued) {
      toast({
        title: '예약 작업이 대기열에 등록되었습니다.',
        description: scheduledAt ? `${new Date(scheduledAt).toLocaleString('ko-KR')} 이후 실행됩니다.` : undefined,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">작업 실행</h3>
        <p className="text-sm text-muted-foreground">
          {draft.target_snapshot_count}명 대상으로 {draft.action_type === 'report' ? '리포트 생성' : draft.action_type === 'comment' ? '코멘트 등록' : '메시지 전송'}을 실행합니다.
        </p>
      </div>

      {!started ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground">준비가 완료되었습니다. 실행 버튼을 눌러주세요.</p>
          {isScheduledFuture && scheduledAt && (
            <p className="text-sm text-muted-foreground">
              예약 실행: {new Date(scheduledAt).toLocaleString('ko-KR')}
            </p>
          )}
          <Button size="lg" onClick={() => setConfirmOpen(true)}>
            <Rocket className="h-5 w-5 mr-2" />
            일괄 작업 실행
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <RunProgressPanel progress={progress} isRunning={isRunning} />

          {isRunning && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={async () => {
                  const result = await cancel()
                  if (!result.success) {
                    toast({ title: '취소 실패', description: result.error ?? '', variant: 'destructive' })
                  } else {
                    toast({ title: '작업 취소 요청이 처리되었습니다.' })
                  }
                }}
              >
                취소
              </Button>
            </div>
          )}

          {isComplete && (
            <div className="space-y-4">
              {hasPendingWork && (
                <div className="flex justify-center">
                  <Button
                  onClick={async () => {
                      const result = await resume()
                      if (!result.success) {
                        const isScheduleWait = (result.error ?? '').includes('예약')
                        toast({
                          title: isScheduleWait ? '예약 대기 중' : '실행 실패',
                          description: result.error ?? '',
                          variant: isScheduleWait ? 'default' : 'destructive',
                        })
                      }
                    }}
                  >
                    {isScheduledFuture ? '지금 바로 실행' : '작업 이어서 실행'}
                  </Button>
                </div>
              )}

              <RunResultActions
                jobId={jobId!}
                failedCount={progress.failed}
                onRetry={retryFailed}
              />

              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => router.push('/reports?tab=jobs')}>
                  작업 이력
                </Button>
                <Button onClick={() => router.push(`/reports/jobs/${jobId}`)}>
                  작업 상세 보기
                </Button>
              </div>

              {!hasPendingWork && (
                <p className="text-center text-xs text-muted-foreground">
                  3초 후 작업 상세 페이지로 자동 이동합니다...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="일괄 작업을 실행하시겠습니까?"
        description={`${draft.target_snapshot_count}명 대상으로 작업이 시작됩니다. 실행 후에는 취소가 어려울 수 있습니다.`}
        confirmText="실행"
        onConfirm={handleExecute}
      />
    </div>
  )
}
