import type { BatchDraft } from '@/core/types/batch.types'
import { WizardStepper } from './WizardStepper'

interface WizardLayoutProps {
  draft: BatchDraft
  children: React.ReactNode
}

export function WizardLayout({ draft, children }: WizardLayoutProps) {
  return (
    <div className="space-y-6">
      <WizardStepper currentStep={draft.step} />
      {children}
    </div>
  )
}
