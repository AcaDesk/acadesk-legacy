import { redirect } from 'next/navigation'
import type { BatchDraft, BatchDraftStep } from '@/core/types/batch.types'
import { isStepAccessible } from '@/core/types/batch.types'

interface WizardStepGuardProps {
  draft: BatchDraft | null
  draftId: string
  targetStep: BatchDraftStep
  children: React.ReactNode
}

export function WizardStepGuard({ draft, draftId, targetStep, children }: WizardStepGuardProps) {
  if (!draft || draft.status === 'archived') {
    redirect('/batch')
  }

  if (!isStepAccessible(draft.step, targetStep)) {
    redirect(`/batch/new/${draftId}/${draft.step}`)
  }

  return <>{children}</>
}
