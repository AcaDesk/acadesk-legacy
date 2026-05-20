import { getDraftCached } from '../_get-draft'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepReview } from '@/components/features/batch/steps/StepReview'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getDraftCached(draftId)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="review">
      <StepReview draftId={draftId} draft={result.data!} />
    </WizardStepGuard>
  )
}
