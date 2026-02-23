import { getBatchDraft } from '@/app/actions/batch-drafts'
import { getLatestJobForDraft } from '@/app/actions/batch-jobs'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepRun } from '@/components/features/batch/steps/StepRun'

export default async function RunPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const [draftResult, jobResult] = await Promise.all([
    getBatchDraft(draftId),
    getLatestJobForDraft(draftId),
  ])

  return (
    <WizardStepGuard draft={draftResult.data} draftId={draftId} targetStep="run">
      <StepRun draftId={draftId} draft={draftResult.data!} initialJob={jobResult.data ?? null} />
    </WizardStepGuard>
  )
}
