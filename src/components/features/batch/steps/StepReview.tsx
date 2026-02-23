'use client'

import { useState, useEffect, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { reviewBatchDraft, patchBatchDraft } from '@/app/actions/batch-drafts'
import { ImpactSummaryCard } from '../shared/ImpactSummaryCard'
import { PreviewSamplesTable } from '../shared/PreviewSamplesTable'
import { RiskAlertList } from '../shared/RiskAlertList'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import { Loader2 } from 'lucide-react'
import type { BatchDraft, ReviewBatchDraftResult } from '@/core/types/batch.types'

interface StepReviewProps {
  draftId: string
  draft: BatchDraft
}

export function StepReview({ draftId, draft }: StepReviewProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [reviewData, setReviewData] = useState<ReviewBatchDraftResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReview() {
      setLoading(true)
      const result = await reviewBatchDraft(draftId)
      if (result.success && result.data) {
        setReviewData(result.data)
      } else {
        toast({ title: '검토 데이터 로드 실패', description: result.error ?? '', variant: 'destructive' })
      }
      setLoading(false)
    }
    loadReview()
  }, [draftId, toast])

  const hasBlockingRisk = reviewData?.risks.some((r) => r.blocking) ?? false

  const handleNext = async (): Promise<boolean> => {
    if (hasBlockingRisk) {
      toast({ title: '차단 리스크가 있어 실행할 수 없습니다.', variant: 'destructive' })
      return false
    }

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await patchBatchDraft(draftId, { step: 'run' })
        if (!result.success) {
          toast({ title: '저장 실패', description: result.error ?? '', variant: 'destructive' })
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>검토 데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (!reviewData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        검토 데이터를 불러올 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">작업 검토</h3>
        <p className="text-sm text-muted-foreground">
          실행 전에 작업 내용을 최종 확인하세요.
        </p>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">실행 시점</p>
        <p className="text-muted-foreground mt-1">
          {draft.schedule?.mode === 'scheduled' && draft.schedule.scheduledAt
            ? `예약 실행 (${new Date(draft.schedule.scheduledAt).toLocaleString('ko-KR')})`
            : '즉시 실행'}
        </p>
      </div>

      <ImpactSummaryCard summary={reviewData.impactSummary} />
      <PreviewSamplesTable samples={reviewData.samples} />
      <RiskAlertList risks={reviewData.risks} />

      <WizardNavButtons
        draftId={draftId}
        currentStep="review"
        onNext={handleNext}
        isNextDisabled={hasBlockingRisk}
        isLoading={isPending}
      />
    </div>
  )
}
