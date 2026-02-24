import { getBatchDraft } from '@/app/actions/batch/drafts'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepTargets } from '@/components/features/batch/steps/StepTargets'

export default async function TargetsPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="targets">
      <StepTargets draftId={draftId} initialTargetIds={result.data?.target_ids ?? []} />
    </WizardStepGuard>
  )
}
