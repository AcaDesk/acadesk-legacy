import { getBatchDraft } from '@/app/actions/batch/drafts'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepOptions } from '@/components/features/batch/steps/StepOptions'

export default async function OptionsPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="options">
      <StepOptions
        draftId={draftId}
        actionType={result.data?.action_type ?? null}
        initialOptions={result.data?.options ?? {}}
        initialSchedule={result.data?.schedule ?? { mode: 'now' }}
      />
    </WizardStepGuard>
  )
}
