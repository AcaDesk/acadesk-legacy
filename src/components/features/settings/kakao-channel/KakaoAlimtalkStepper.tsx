'use client'

import { Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@ui/alert'
import { cn } from '@/lib/utils'

export interface KakaoTemplateSummary {
  total: number
  approved: number
  inspecting: number
  rejected: number
  pending: number
}

interface KakaoAlimtalkStepperProps {
  hasKakaoChannel: boolean
  templateSummary: KakaoTemplateSummary | null
}

const STEPS = [
  { label: 'API 설정' },
  { label: '채널 연동' },
  { label: '템플릿 등록' },
  { label: '검수 승인' },
  { label: '발송 가능' },
]

function getCurrentStep(
  hasKakaoChannel: boolean,
  summary: KakaoTemplateSummary | null
): number {
  // Step 1 (API 설정) is always complete since this tab is only visible when solapi is verified
  if (!hasKakaoChannel) return 2
  if (!summary || summary.total === 0) return 3
  if (summary.approved === 0) return 4
  return 5 // All done
}

function getBanner(
  hasKakaoChannel: boolean,
  summary: KakaoTemplateSummary | null
): { type: 'info' | 'warning' | 'success'; message: string } | null {
  if (!hasKakaoChannel) {
    return { type: 'info', message: '카카오 채널을 연동해주세요.' }
  }

  if (!summary) return null

  if (summary.total === 0) {
    return {
      type: 'info',
      message: '알림톡을 발송하려면 템플릿을 등록하고 카카오 검수를 받아야 합니다.',
    }
  }

  if (summary.rejected > 0) {
    return {
      type: 'warning',
      message: '반려된 템플릿이 있습니다. 수정 후 재검수를 요청해주세요.',
    }
  }

  if (summary.approved === 0 && summary.inspecting > 0) {
    return {
      type: 'info',
      message: '카카오에서 템플릿을 검수 중입니다. 승인까지 보통 1~2영업일 소요됩니다.',
    }
  }

  if (summary.approved > 0 && hasKakaoChannel) {
    return {
      type: 'success',
      message: '알림톡 발송 준비가 완료되었습니다!',
    }
  }

  return null
}

const bannerStyles = {
  info: 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
  warning: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
  success: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
}

const bannerTextStyles = {
  info: 'text-blue-900 dark:text-blue-100',
  warning: 'text-amber-900 dark:text-amber-100',
  success: 'text-green-900 dark:text-green-100',
}

const bannerIconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
}

const bannerIconStyles = {
  info: 'text-blue-600',
  warning: 'text-amber-600',
  success: 'text-green-600',
}

export function KakaoAlimtalkStepper({
  hasKakaoChannel,
  templateSummary,
}: KakaoAlimtalkStepperProps) {
  const currentStep = getCurrentStep(hasKakaoChannel, templateSummary)
  const allComplete = currentStep === 5
  const banner = getBanner(hasKakaoChannel, templateSummary)

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const stepNum = i + 1
            const isComplete = allComplete ? true : stepNum < currentStep
            const isCurrent = !allComplete && stepNum === currentStep

            return (
              <div key={stepNum} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      isComplete && 'bg-primary text-primary-foreground',
                      isCurrent && 'border-2 border-primary bg-background text-primary ring-2 ring-primary/20',
                      !isComplete && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : stepNum}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] whitespace-nowrap',
                      isComplete && 'text-foreground font-medium',
                      isCurrent && 'text-primary font-semibold',
                      !isComplete && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1.5 h-0.5 w-8 sm:w-12 md:w-16 transition-colors',
                      stepNum < currentStep || allComplete ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <Alert className={bannerStyles[banner.type]}>
          {(() => {
            const Icon = bannerIconMap[banner.type]
            return <Icon className={cn('h-4 w-4', bannerIconStyles[banner.type])} />
          })()}
          <AlertDescription className={cn('text-sm', bannerTextStyles[banner.type])}>
            {banner.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
