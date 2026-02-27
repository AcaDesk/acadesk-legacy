'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { patchBatchDraft } from '@/app/actions/batch/drafts'
import { ActionCardGroup } from '../shared/ActionCardGroup'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import type { BatchActionType } from '@/core/types/batch.types'

interface StepActionProps {
  draftId: string
  initialActionType: BatchActionType | null
  targetCount: number
}

export function StepAction({ draftId, initialActionType, targetCount }: StepActionProps) {
  const { toast } = useToast()
  const [actionType, setActionType] = useState<BatchActionType | null>(initialActionType)

  const handleNext = async (): Promise<boolean> => {
    if (!actionType) {
      toast({ title: '작업을 선택해주세요.', variant: 'destructive' })
      return false
    }

    // Fire-and-forget: 저장을 기다리지 않고 즉시 네비게이션
    // options 페이지는 URL 파라미터로 action_type을 전달받음
    patchBatchDraft(draftId, {
      action_type: actionType,
      step: 'options',
    }).catch(() => {
      toast({ title: '저장 중 오류가 발생했습니다. 페이지를 새로고침하세요.', variant: 'destructive' })
    })

    return true
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">수행할 작업 선택</h3>
        <p className="text-sm text-muted-foreground">
          선택된 {targetCount}명의 학생에게 수행할 작업을 선택하세요.
        </p>
      </div>

      <ActionCardGroup
        selected={actionType}
        onSelect={setActionType}
        targetCount={targetCount}
      />

      <WizardNavButtons
        draftId={draftId}
        currentStep="action"
        onNext={handleNext}
        isNextDisabled={!actionType}
        nextSearchParams={actionType ? { action: actionType } : undefined}
      />
    </div>
  )
}
