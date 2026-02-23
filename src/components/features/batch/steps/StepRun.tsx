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
import type { BatchDraft } from '@/core/types/batch.types'

interface StepRunProps {
  draftId: string
  draft: BatchDraft
}

export function StepRun({ draftId, draft }: StepRunProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [started, setStarted] = useState(false)

  const { jobId, progress, isRunning, isComplete, start, cancel, retryFailed } = useBatchExecution({
    draftId,
    onComplete: (completedJobId) => {
      toast({ title: '작업이 종료되었습니다.' })
      // 3초 후 자동 이동
      setTimeout(() => router.push(`/jobs/${completedJobId}`), 3000)
    },
  })

  const handleExecute = async () => {
    setConfirmOpen(false)
    setStarted(true)
    const idempotencyKey = crypto.randomUUID()
    const result = await start(idempotencyKey)
    if (!result.success) {
      toast({ title: '실행 실패', description: result.error ?? '', variant: 'destructive' })
      setStarted(false)
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
              <RunResultActions
                jobId={jobId!}
                failedCount={progress.failed}
                onRetry={retryFailed}
              />

              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => router.push('/batch')}>
                  일괄작업 홈
                </Button>
                <Button onClick={() => router.push(`/jobs/${jobId}`)}>
                  작업 상세 보기
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                3초 후 작업 상세 페이지로 자동 이동합니다...
              </p>
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
