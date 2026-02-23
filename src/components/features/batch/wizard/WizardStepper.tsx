import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BATCH_STEPS, type BatchDraftStep, getStepIndex } from '@/core/types/batch.types'

interface WizardStepperProps {
  currentStep: BatchDraftStep
}

function StepItem({
  label,
  stepNumber,
  isCurrent,
  isCompleted,
  isFirst,
  isLast,
}: {
  label: string
  stepNumber: number
  isCurrent: boolean
  isCompleted: boolean
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li
      className="flex-1 flex flex-col items-center relative"
      aria-current={isCurrent ? 'step' : undefined}
    >
      <div className="absolute top-4 w-full h-0.5 -z-10">
        {!isFirst && (
          <div className="absolute right-1/2 w-1/2 h-full">
            <div className={cn('h-full w-full', isCurrent || isCompleted ? 'bg-primary' : 'bg-muted')} />
          </div>
        )}
        {!isLast && (
          <div className="absolute left-1/2 w-1/2 h-full">
            <div className={cn('h-full w-full', isCompleted ? 'bg-primary' : 'bg-muted')} />
          </div>
        )}
      </div>

      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 transition-all duration-300 text-sm',
          isCompleted
            ? 'bg-primary text-primary-foreground'
            : isCurrent
            ? 'bg-background border-2 border-primary ring-4 ring-primary/20 scale-110'
            : 'bg-muted border-2 border-muted-foreground/20 text-muted-foreground'
        )}
      >
        {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNumber}
      </div>

      <p
        className={cn(
          'mt-2 text-center text-xs font-semibold whitespace-nowrap transition-colors',
          isCurrent ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {label}
      </p>
    </li>
  )
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  const currentIndex = getStepIndex(currentStep)

  return (
    <nav aria-label="일괄작업 진행 단계" className="mb-8 w-full">
      <ol className="flex justify-between items-start">
        {BATCH_STEPS.map((step, index) => (
          <StepItem
            key={step.key}
            label={step.label}
            stepNumber={index + 1}
            isCurrent={index === currentIndex}
            isCompleted={index < currentIndex}
            isFirst={index === 0}
            isLast={index === BATCH_STEPS.length - 1}
          />
        ))}
      </ol>

      <div className="text-center mt-6">
        <h3 className="text-lg font-semibold">{BATCH_STEPS[currentIndex].label}</h3>
        <p className="text-sm text-muted-foreground">{BATCH_STEPS[currentIndex].description}</p>
      </div>
    </nav>
  )
}
