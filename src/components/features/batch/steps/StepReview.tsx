'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { reviewBatchDraft, patchBatchDraft } from '@/app/actions/batch/drafts'
import { ImpactSummaryCard } from '../shared/ImpactSummaryCard'
import { PreviewSamplesTable } from '../shared/PreviewSamplesTable'
import { RiskAlertList } from '../shared/RiskAlertList'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import { Loader2, Clock } from 'lucide-react'
import { Badge } from '@ui/badge'
import type { BatchDraft, ReviewBatchDraftResult } from '@/core/types/batch.types'

interface StepReviewProps {
  draftId: string
  draft: BatchDraft
}

export function StepReview({ draftId, draft }: StepReviewProps) {
  const { toast } = useToast()
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

    // Fire-and-forget: run 스텝은 실행 UI만 표시하므로 즉시 네비게이션
    patchBatchDraft(draftId, { step: 'run' }).catch(() => {
      toast({ title: '저장 중 오류가 발생했습니다.', variant: 'destructive' })
    })

    return true
  }

  const scheduleLabel = draft.schedule?.mode === 'scheduled' && draft.schedule.scheduledAt
    ? `예약: ${new Date(draft.schedule.scheduledAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : '즉시 실행'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">작업 검토</h3>
          <p className="text-sm text-muted-foreground">실행 전에 작업 내용을 최종 확인하세요.</p>
        </div>
        <Badge variant="outline" className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Clock className="h-3.5 w-3.5" />
          {scheduleLabel}
        </Badge>
      </div>

      <ImpactSummaryCard summary={reviewData.impactSummary} />
      <PreviewSamplesTable samples={reviewData.samples} />
      <RiskAlertList risks={reviewData.risks} />

      <WizardNavButtons
        draftId={draftId}
        currentStep="review"
        onNext={handleNext}
        isNextDisabled={hasBlockingRisk}
      />
    </div>
  )
}
