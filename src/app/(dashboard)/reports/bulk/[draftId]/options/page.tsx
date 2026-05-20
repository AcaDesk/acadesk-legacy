import { getDraftCached } from '../_get-draft'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepOptions } from '@/components/features/batch/steps/StepOptions'
import type { BatchActionType } from '@/core/types/batch.types'

function parseActionType(raw?: string): BatchActionType | null {
  if (raw === 'report' || raw === 'comment' || raw === 'send') return raw
  return null
}

export default async function OptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { draftId } = await params
  const { action } = await searchParams
  const result = await getDraftCached(draftId)

  const actionType = parseActionType(action) ?? result.data?.action_type ?? null

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="options">
      <StepOptions
        draftId={draftId}
        actionType={actionType}
        initialOptions={result.data?.options ?? {}}
        initialSchedule={result.data?.schedule ?? { mode: 'now' }}
      />
    </WizardStepGuard>
  )
}
