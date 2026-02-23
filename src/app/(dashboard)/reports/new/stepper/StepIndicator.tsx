'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REPORT_STEPS, type ReportStepKey, getStepIndex } from './report-stepper-types'

interface StepIndicatorProps {
  currentStep: ReportStepKey
  completedSteps: Set<ReportStepKey>
  onStepClick: (step: ReportStepKey) => void
  canGoToStep: (step: ReportStepKey) => boolean
}

export function StepIndicator({ currentStep, completedSteps, onStepClick, canGoToStep }: StepIndicatorProps) {
  const currentIndex = getStepIndex(currentStep)

  return (
    <nav aria-label="리포트 생성 진행 단계" className="w-full">
      <ol className="flex justify-between items-start">
        {REPORT_STEPS.map((step, index) => {
          const isCurrent = index === currentIndex
          const isCompleted = completedSteps.has(step.key)
          const isClickable = canGoToStep(step.key)

          return (
            <li
              key={step.key}
              className="flex-1 flex flex-col items-center relative"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Connecting lines */}
              <div className="absolute top-4 w-full h-0.5 -z-10">
                {index > 0 && (
                  <div className="absolute right-1/2 w-1/2 h-full">
                    <div className={cn('h-full w-full', isCurrent || isCompleted ? 'bg-primary' : 'bg-muted')} />
                  </div>
                )}
                {index < REPORT_STEPS.length - 1 && (
                  <div className="absolute left-1/2 w-1/2 h-full">
                    <div className={cn('h-full w-full', isCompleted ? 'bg-primary' : 'bg-muted')} />
                  </div>
                )}
              </div>

              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 transition-all duration-300 text-sm',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-background border-2 border-primary ring-4 ring-primary/20 scale-110'
                      : 'bg-muted border-2 border-muted-foreground/20 text-muted-foreground',
                  isClickable && !isCurrent && 'cursor-pointer hover:opacity-80',
                  !isClickable && !isCurrent && 'cursor-not-allowed'
                )}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
              </button>

              {/* Step label */}
              <p
                className={cn(
                  'mt-2 text-center text-xs font-semibold whitespace-nowrap transition-colors',
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
            </li>
          )
        })}
      </ol>

      <div className="text-center mt-6">
        <h3 className="text-lg font-semibold">{REPORT_STEPS[currentIndex].label}</h3>
        <p className="text-sm text-muted-foreground">{REPORT_STEPS[currentIndex].description}</p>
      </div>
    </nav>
  )
}
