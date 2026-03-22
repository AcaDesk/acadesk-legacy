'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { patchBatchDraft } from '@/app/actions/batch/drafts'
import { OptionsFormSwitch } from '../shared/OptionsFormSwitch'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import type { BatchActionType, BatchOptions, BatchSchedule } from '@/core/types/batch.types'
import { normalizeBatchOptions } from '@/lib/batch-options'

interface StepOptionsProps {
  draftId: string
  actionType: BatchActionType | null
  initialOptions: BatchOptions
  initialSchedule: BatchSchedule
}

export function StepOptions({ draftId, actionType, initialOptions, initialSchedule }: StepOptionsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [options, setOptions] = useState<BatchOptions>(() =>
    normalizeBatchOptions(actionType, initialOptions)
  )
  const [schedule, setSchedule] = useState<BatchSchedule>(initialSchedule ?? { mode: 'now' })

  if (!actionType) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        작업 유형이 선택되지 않았습니다. 이전 단계로 돌아가주세요.
      </div>
    )
  }

  const handleNext = async (): Promise<boolean> => {
    if (schedule.mode === 'scheduled') {
      if (!schedule.scheduledAt) {
        toast({ title: '예약 실행 시간을 설정해주세요.', variant: 'destructive' })
        return false
      }
      if (new Date(schedule.scheduledAt).getTime() <= Date.now()) {
        toast({ title: '예약 시간은 현재보다 이후여야 합니다.', variant: 'destructive' })
        return false
      }
    }

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const normalizedOptions = normalizeBatchOptions(actionType, options)
        const result = await patchBatchDraft(draftId, {
          options: normalizedOptions,
          schedule,
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

  const scheduledDate = schedule.mode === 'scheduled' && schedule.scheduledAt
    ? new Date(schedule.scheduledAt)
    : undefined
  const normalizedOptions = normalizeBatchOptions(actionType, options)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 왼쪽: 작업 옵션 폼 */}
        <div className="lg:col-span-2">
          <OptionsFormSwitch
            actionType={actionType}
            value={normalizedOptions}
            onChange={setOptions}
          />
        </div>

        {/* 오른쪽: 실행 시점 */}
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-3">실행 시점</p>
            <Select
              value={schedule.mode}
              onValueChange={(mode) => {
                if (mode === 'now') {
                  setSchedule({ mode: 'now' })
                } else {
                  setSchedule({ mode: 'scheduled', scheduledAt: schedule.scheduledAt })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">즉시 실행</SelectItem>
                <SelectItem value="scheduled">예약 실행</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {schedule.mode === 'scheduled' && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">예약 일시</Label>
              <DatePicker
                value={scheduledDate}
                onChange={(date) => {
                  if (!date) {
                    setSchedule({ mode: 'scheduled', scheduledAt: undefined })
                    return
                  }
                  setSchedule({ mode: 'scheduled', scheduledAt: date.toISOString() })
                }}
                placeholder="날짜 선택"
                dateFormat="yyyy년 MM월 dd일"
                disabled={(date) => date < new Date()}
              />
            </div>
          )}
        </div>
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
