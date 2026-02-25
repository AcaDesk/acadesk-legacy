'use client'

import { useReportStepper } from './use-report-stepper'
import { StepIndicator } from './StepIndicator'
import { SummaryBar } from './SummaryBar'
import { SetupStep } from './steps/SetupStep'
import { DataReviewStep } from './steps/DataReviewStep'
import { CommentStep } from './steps/CommentStep'
import { ConfirmStep } from './steps/ConfirmStep'

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
  const stepper = useReportStepper()

  return (
    <div className="p-6 lg:p-8 space-y-6">
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
        {stepper.currentStep === 'setup' && (
          <SetupStep
            students={initialStudents}
            selectedStudent={stepper.student}
            period={stepper.period}
            isValid={!!stepper.student && stepper.isPeriodValid()}
            onSelectStudent={stepper.setStudent}
            onClearStudent={stepper.clearStudent}
            onPeriodChange={stepper.setPeriod}
            onConfirm={stepper.confirmSetup}
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

        {stepper.currentStep === 'confirm' && (
          <ConfirmStep
            previewData={stepper.getPreviewData()}
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
    </div>
  )
}
