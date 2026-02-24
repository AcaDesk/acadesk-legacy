import { getBatchDraft } from '@/app/actions/batch/drafts'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepAction } from '@/components/features/batch/steps/StepAction'

export default async function ActionPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="action">
      <StepAction
        draftId={draftId}
        initialActionType={result.data?.action_type ?? null}
        targetCount={result.data?.target_snapshot_count ?? 0}
      />
    </WizardStepGuard>
  )
}
