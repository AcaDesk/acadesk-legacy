'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { patchBatchDraft } from '@/app/actions/batch-drafts'
import { OptionsFormSwitch } from '../shared/OptionsFormSwitch'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import type { BatchActionType, BatchOptions } from '@/core/types/batch.types'

interface StepOptionsProps {
  draftId: string
  actionType: BatchActionType | null
  initialOptions: BatchOptions
}

export function StepOptions({ draftId, actionType, initialOptions }: StepOptionsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [options, setOptions] = useState<BatchOptions>(initialOptions)

  if (!actionType) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        작업 유형이 선택되지 않았습니다. 이전 단계로 돌아가주세요.
      </div>
    )
  }

  const handleNext = async (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await patchBatchDraft(draftId, {
          options,
          step: 'review',
        })
        if (!result.success) {
          toast({ title: '저장 실패', description: result.error ?? '', variant: 'destructive' })
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">옵션 설정</h3>
        <p className="text-sm text-muted-foreground">
          작업 세부 옵션을 설정하세요.
        </p>
      </div>

      <div className="max-w-xl">
        <OptionsFormSwitch
          actionType={actionType}
          value={options}
          onChange={setOptions}
        />
      </div>

      <WizardNavButtons
        draftId={draftId}
        currentStep="options"
        onNext={handleNext}
        isLoading={isPending}
      />
    </div>
  )
}
