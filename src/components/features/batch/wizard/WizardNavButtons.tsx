'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Loader2, ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { STEP_ORDER, type BatchDraftStep, getStepIndex } from '@/core/types/batch.types'

interface WizardNavButtonsProps {
  draftId: string
  currentStep: BatchDraftStep
  onNext?: () => Promise<boolean>
  isNextDisabled?: boolean
  isLoading?: boolean
  isLastStep?: boolean
  onExecute?: () => void
}

export function WizardNavButtons({
  draftId,
  currentStep,
  onNext,
  isNextDisabled = false,
  isLoading = false,
  isLastStep = false,
  onExecute,
}: WizardNavButtonsProps) {
  const router = useRouter()
  const currentIndex = getStepIndex(currentStep)
  const isFirstStep = currentIndex === 0

  const handlePrev = () => {
    if (isFirstStep) {
      router.push('/batch')
      return
    }
    const prevStep = STEP_ORDER[currentIndex - 1]
    router.push(`/batch/new/${draftId}/${prevStep}`)
  }

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext()
      if (!canProceed) return
    }
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1]
      router.push(`/batch/new/${draftId}/${nextStep}`)
    }
  }

  return (
    <div className="flex justify-between gap-2 pt-6 border-t">
      <Button
        variant="outline"
        onClick={handlePrev}
        disabled={isLoading}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {isFirstStep ? '취소' : '이전'}
      </Button>

      {isLastStep ? (
        <Button onClick={onExecute} disabled={isNextDisabled || isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4 mr-2" />
          )}
          실행
        </Button>
      ) : (
        <Button onClick={handleNext} disabled={isNextDisabled || isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          다음
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  )
}
