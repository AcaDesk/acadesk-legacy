import { getDraftCached } from '../_get-draft'
import { WizardStepGuard } from '@/components/features/batch/wizard/WizardStepGuard'
import { StepAction } from '@/components/features/batch/steps/StepAction'

export default async function ActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>
  searchParams: Promise<{ count?: string }>
}) {
  const { draftId } = await params
  const { count } = await searchParams
  const result = await getDraftCached(draftId)

  const targetCount = count ? parseInt(count, 10) : (result.data?.target_snapshot_count ?? 0)

  return (
    <WizardStepGuard draft={result.data} draftId={draftId} targetStep="action">
      <StepAction
        draftId={draftId}
        initialActionType={result.data?.action_type ?? null}
        targetCount={targetCount}
      />
    </WizardStepGuard>
  )
}
