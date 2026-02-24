import { getBatchDraft } from '@/app/actions/batch/drafts'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepReview } from '@/components/features/batch/steps/StepReview'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="review">
      <StepReview draftId={draftId} draft={result.data!} />
    </WizardStepGuard>
  )
}
