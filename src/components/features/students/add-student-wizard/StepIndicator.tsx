import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepInfo } from './types'

interface StepProps {
  step: StepInfo
  stepNumber: number
  isCurrent: boolean
  isCompleted: boolean
  isFirst: boolean
  isLast: boolean
}

// ✨ 1. 각 스텝 아이템을 별도의 컴포넌트로 분리하여 로직을 캡슐화
function Step({ step, stepNumber, isCurrent, isCompleted, isFirst, isLast }: StepProps) {
  return (
    <li
      className="flex-1 flex flex-col items-center relative"
      // ✨ 3. 현재 스텝을 스크린 리더에게 알려주는 ARIA 속성 추가
      aria-current={isCurrent ? 'step' : undefined}
    >
      {/* ✨ 1-A. 깔끔한 연결선 구현: 완료된 스텝 사이의 선만 활성화 */}
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

      {/* ✨ 1-B. 상태별로 명확하게 구분된 스텝 동그라미 */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 transition-all duration-300',
          isCompleted
            ? 'bg-primary text-primary-foreground'
            : isCurrent
            ? 'bg-background border-2 border-primary ring-4 ring-primary/20 scale-110'
            : 'bg-muted border-2 border-muted-foreground/20 text-muted-foreground'
        )}
      >
        {isCompleted ? <Check size={18} strokeWidth={3} /> : stepNumber}
      </div>

      {/* 레이블 */}
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
}


interface StepIndicatorProps {
  currentStep: number
  steps: StepInfo[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    // ✨ 3. 전체를 시맨틱한 <nav>와 <ol> 태그로 감싸 접근성 향상
    <nav aria-label="Wizard progress" className="mb-8 w-full">
      <ol className="flex justify-between items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          return (
            <Step
              key={step.label}
              step={step}
              stepNumber={stepNumber}
              isCurrent={currentStep === stepNumber}
              isCompleted={currentStep > stepNumber}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
            />
          )
        })}
      </ol>

      {/* 현재 스텝 설명 (이 부분은 기존 구현이 훌륭하여 유지) */}
      <div className="text-center mt-6">
        <h3 className="text-lg font-semibold">{steps[currentStep - 1].label}</h3>
        <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
      </div>
    </nav>
  )
}
