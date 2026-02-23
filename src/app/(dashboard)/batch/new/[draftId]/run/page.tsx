import { getBatchDraft } from '@/app/actions/batch-drafts'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepRun } from '@/components/features/batch/steps/StepRun'

export default async function RunPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="run">
      <StepRun draftId={draftId} draft={result.data!} />
    </WizardStepGuard>
  )
}
