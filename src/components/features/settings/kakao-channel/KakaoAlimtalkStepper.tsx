'use client'

import { Check, Info, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@ui/alert'
import { Progress } from '@ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
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
  { label: 'API 설정', description: '솔라피 API 키 등록 및 인증' },
  { label: '채널 연동', description: '카카오 비즈니스 채널 연결' },
  { label: '템플릿 등록', description: '알림톡 발송용 템플릿 작성' },
  { label: '검수 승인', description: '카카오 검수 완료 (1~2영업일)' },
  { label: '발송 가능', description: '알림톡 발송 준비 완료' },
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
  success: 'border-success/20 bg-success/5',
}

const bannerTextStyles = {
  info: 'text-blue-900 dark:text-blue-100',
  warning: 'text-amber-900 dark:text-amber-100',
  success: 'text-success',
}

const bannerIconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
}

const bannerIconStyles = {
  info: 'text-blue-600',
  warning: 'text-amber-600',
  success: 'text-success',
}

export function KakaoAlimtalkStepper({
  hasKakaoChannel,
  templateSummary,
}: KakaoAlimtalkStepperProps) {
  const currentStep = getCurrentStep(hasKakaoChannel, templateSummary)
  const allComplete = currentStep === 5
  const banner = getBanner(hasKakaoChannel, templateSummary)

  const completedSteps = allComplete ? STEPS.length : currentStep - 1
  const percentage = Math.round((completedSteps / STEPS.length) * 100)
  const currentStepInfo = STEPS[currentStep - 1]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">알림톡 설정 진행 상황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Progress Bar — SendProgressPanel 스타일 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {allComplete
                  ? '모든 단계 완료'
                  : `${completedSteps} / ${STEPS.length} 단계 완료`}
              </span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* 현재 진행 단계 */}
          {!allComplete && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span>
                <span className="font-medium text-foreground">{currentStepInfo.label}</span>
                {' — '}
                {currentStepInfo.description}
              </span>
            </div>
          )}

          {/* Step Circles */}
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
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                        isComplete && 'bg-primary text-primary-foreground shadow-sm',
                        isCurrent &&
                          'border-2 border-primary bg-background text-primary ring-2 ring-primary/20',
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
                        'mx-1.5 mb-5 h-0.5 w-8 sm:w-12 md:w-16 transition-colors',
                        stepNum < currentStep || allComplete ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
