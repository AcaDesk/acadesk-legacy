'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { FileText } from 'lucide-react'
import { useReportStepper } from './use-report-stepper'
import { StepIndicator } from './StepIndicator'
import { SummaryBar } from './SummaryBar'
import { StudentSelectStep } from './steps/StudentSelectStep'
import { PeriodTypeStep } from './steps/PeriodTypeStep'
import { DataReviewStep } from './steps/DataReviewStep'
import { CommentStep } from './steps/CommentStep'
import { PreviewStep } from './steps/PreviewStep'
import { SubmitStep } from './steps/SubmitStep'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: { name: string } | null
  class_enrollments?: Array<{ classes: { name: string } | null }>
}

interface StepperLayoutProps {
  initialStudents: Student[]
}

export function StepperLayout({ initialStudents }: StepperLayoutProps) {
  const router = useRouter()
  const stepper = useReportStepper()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">리포트 생성</h1>
            <p className="text-muted-foreground mt-1">
              학생별 주간/월간 성적 리포트를 단계별로 생성합니다
            </p>
          </div>
          <Button onClick={() => router.push('/reports')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            리포트 목록
          </Button>
        </div>
      </section>

      {/* Stepper Content */}
      <section
        aria-label="리포트 생성 스텝퍼"
        className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '100ms' }}
      >
        {/* Step Indicator */}
        <StepIndicator
          currentStep={stepper.currentStep}
          completedSteps={stepper.completedSteps}
          onStepClick={stepper.goToStep}
          canGoToStep={stepper.canGoToStep}
        />

        {/* Summary Bar */}
        <SummaryBar
          student={stepper.student}
          periodLabel={stepper.periodLabel}
          dataLoaded={stepper.dataLoaded}
          dataError={stepper.dataError}
          warningCount={stepper.warnings.length}
          commentProgress={stepper.commentProgress}
        />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {stepper.currentStep === 'student' && (
            <StudentSelectStep
              students={initialStudents}
              selectedStudent={stepper.student}
              onSelect={stepper.setStudent}
              onClear={stepper.clearStudent}
            />
          )}

          {stepper.currentStep === 'period' && (
            <PeriodTypeStep
              period={stepper.period}
              onPeriodChange={stepper.setPeriod}
              onConfirm={stepper.confirmPeriod}
              onBack={stepper.goPrev}
            />
          )}

          {stepper.currentStep === 'data' && (
            <DataReviewStep
              loading={stepper.dataLoading}
              loaded={stepper.dataLoaded}
              error={stepper.dataError}
              reportData={stepper.reportData}
              warnings={stepper.warnings}
              onFetch={stepper.fetchReportData}
              onNext={stepper.goNext}
              onBack={stepper.goPrev}
            />
          )}

          {stepper.currentStep === 'comment' && (
            <CommentStep
              comment={stepper.comment}
              onChange={stepper.updateComment}
              onConfirm={stepper.confirmComment}
              onBack={stepper.goPrev}
              reportData={stepper.reportData}
            />
          )}

          {stepper.currentStep === 'preview' && (
            <PreviewStep
              previewData={stepper.getPreviewData()}
              onConfirm={stepper.confirmPreview}
              onBack={stepper.goPrev}
            />
          )}

          {stepper.currentStep === 'submit' && (
            <SubmitStep
              student={stepper.student}
              periodLabel={stepper.periodLabel}
              commentProgress={stepper.commentProgress}
              dataLoaded={stepper.dataLoaded}
              warningCount={stepper.warnings.length}
              sendAfterSave={stepper.sendAfterSave}
              onSendAfterSaveChange={stepper.setSendAfterSave}
              generating={stepper.generating}
              sending={stepper.sending}
              isReady={stepper.isAllRequiredComplete}
              onSubmit={stepper.handleSubmit}
              onBack={stepper.goPrev}
            />
          )}
        </div>
      </section>
    </div>
  )
}
