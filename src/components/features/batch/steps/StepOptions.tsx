'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { patchBatchDraft } from '@/app/actions/batch-drafts'
import { OptionsFormSwitch } from '../shared/OptionsFormSwitch'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import { Label } from '@ui/label'
import { Input } from '@ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import type { BatchActionType, BatchOptions, BatchSchedule } from '@/core/types/batch.types'

interface StepOptionsProps {
  draftId: string
  actionType: BatchActionType | null
  initialOptions: BatchOptions
  initialSchedule: BatchSchedule
}

function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function StepOptions({ draftId, actionType, initialOptions, initialSchedule }: StepOptionsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [options, setOptions] = useState<BatchOptions>(initialOptions)
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
        const result = await patchBatchDraft(draftId, {
          options,
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

      <div className="max-w-xl space-y-3 border rounded-lg p-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">실행 시점</Label>
          <Select
            value={schedule.mode}
            onValueChange={(mode) => {
              if (mode === 'now') {
                setSchedule({ mode: 'now' })
                return
              }
              setSchedule({
                mode: 'scheduled',
                scheduledAt: schedule.scheduledAt,
              })
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
            <Input
              type="datetime-local"
              value={toDateTimeLocalValue(schedule.scheduledAt)}
              onChange={(e) => {
                const next = e.target.value
                setSchedule({
                  mode: 'scheduled',
                  scheduledAt: next ? new Date(next).toISOString() : undefined,
                })
              }}
            />
          </div>
        )}
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
