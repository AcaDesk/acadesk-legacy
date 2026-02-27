import type { BatchDraft } from '@/core/types/batch.types'
import { WizardStepper } from './WizardStepper'

interface WizardLayoutProps {
  draft: BatchDraft
  children: React.ReactNode
}

export function WizardLayout({ draft, children }: WizardLayoutProps) {
  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <WizardStepper currentStep={draft.step} />
        {children}
      </div>
    </div>
  )
}
