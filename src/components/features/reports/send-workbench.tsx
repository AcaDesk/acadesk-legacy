'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { useToast } from '@/hooks/use-toast'
import { classifyReportSendError, type ReportSendErrorInfo } from '@/lib/report-send-errors'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'
import { SendProgressPanel } from '@/components/features/reports/send-progress-panel'
import { ReportBulkErrorDialog } from '@/components/features/reports/report-error-dialog'
import type { ReportWithStudent } from '@/core/types/report.types'

interface SendWorkbenchProps {
  data: ReportWithStudent[]
  loading: boolean
  onComplete: () => void
}

type Step = 'select' | 'preview' | 'sending'

export function SendWorkbench({ data, loading, onComplete }: SendWorkbenchProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('select')
  const [selectedReports, setSelectedReports] = useState<ReportWithStudent[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0, successCount: 0, failCount: 0 })
  const [currentStudentName, setCurrentStudentName] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<Array<{ name: string; error: ReportSendErrorInfo }>>([])
  const [bulkErrorDialogOpen, setBulkErrorDialogOpen] = useState(false)
  const cancelRef = useRef(false)

  // Only unsent reports
  const unsentData = data.filter((r) => r.sent_at === null)

  const handleSelectionChange = useCallback((reports: ReportWithStudent[]) => {
    const nextReports = reports.filter((r) => r.sent_at === null)

    setSelectedReports((prev) => {
      if (
        prev.length === nextReports.length &&
        prev.every((report, index) => report.id === nextReports[index]?.id)
      ) {
        return prev
      }
      return nextReports
    })
  }, [])

  function handleStartPreview() {
    if (selectedReports.length === 0) return
    setStep('preview')
  }

  async function handleStartSend() {
    setStep('sending')
    setIsComplete(false)
    cancelRef.current = false
    setProgress({ current: 0, total: selectedReports.length, successCount: 0, failCount: 0 })

    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports-send')

      let totalSuccess = 0
      let totalFail = 0
      const classifiedErrors: Array<{ name: string; error: ReportSendErrorInfo }> = []
      let processed = 0

      const CONCURRENCY = 3
      for (let i = 0; i < selectedReports.length; i += CONCURRENCY) {
        if (cancelRef.current) break

        const batch = selectedReports.slice(i, i + CONCURRENCY)

        const results = await Promise.allSettled(
          batch.map(async (report) => {
            const studentName = report.students?.users?.name || '알 수 없음'
            setCurrentStudentName(studentName)
            try {
              const result = await sendReportToAllGuardians(report.id)
              if (result.success && result.data) {
                return { success: true as const, successCount: result.data.successCount, failCount: result.data.failCount }
              } else {
                const classified = result.errorInfo ?? classifyReportSendError(result.error || '전송 실패')
                return { success: false as const, name: studentName, error: classified }
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : '전송 실패'
              return { success: false as const, name: studentName, error: classifyReportSendError(errorMessage) }
            }
          })
        )

        for (const result of results) {
          processed++
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              totalSuccess += result.value.successCount
              totalFail += result.value.failCount
            } else {
              classifiedErrors.push({ name: result.value.name, error: result.value.error })
            }
          }
          setProgress({
            current: processed,
            total: selectedReports.length,
            successCount: totalSuccess,
            failCount: totalFail + classifiedErrors.length,
          })
        }
      }

      setIsComplete(true)

      if (classifiedErrors.length > 0) {
        setBulkErrors(classifiedErrors)
        setBulkErrorDialogOpen(true)
      }

      if (totalSuccess > 0) {
        toast({
          title: cancelRef.current ? '전송 취소됨' : '전송 완료',
          description: `${totalSuccess}명의 보호자에게 전송되었습니다.${classifiedErrors.length > 0 ? ` ${classifiedErrors.length}개 실패` : ''}`,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '일괄 전송 중 오류가 발생했습니다.'
      setIsComplete(true)
      setBulkErrors([{ name: '일괄 전송', error: classifyReportSendError(errorMessage) }])
      setBulkErrorDialogOpen(true)
      toast({
        title: '전송 오류',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setCurrentStudentName('')
    }
  }

  function handleCancel() {
    cancelRef.current = true
  }

  function handleDone() {
    setStep('select')
    setSelectedReports([])
    setIsComplete(false)
    onComplete()
  }

  function handleBackToSelect() {
    setStep('select')
  }

  if (step === 'sending') {
    return (
      <>
        <SendProgressPanel
          current={progress.current}
          total={progress.total}
          successCount={progress.successCount}
          failCount={progress.failCount}
          currentStudentName={currentStudentName}
          isComplete={isComplete}
          onCancel={handleCancel}
          onDone={handleDone}
        />
        <ReportBulkErrorDialog
          open={bulkErrorDialogOpen}
          onOpenChange={setBulkErrorDialogOpen}
          errors={bulkErrors}
          onClose={() => {
            setBulkErrorDialogOpen(false)
            setBulkErrors([])
          }}
        />
      </>
    )
  }

  if (step === 'preview') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">전송 미리보기</CardTitle>
          <CardDescription>
            {selectedReports.length}개의 리포트가 각 학생의 보호자에게 전송됩니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <div className="p-3 bg-muted/50 border-b">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Send className="h-4 w-4 text-primary" />
                전송 대상 ({selectedReports.length}개)
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {selectedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium">{report.students?.users?.name || '이름 없음'}</span>
                  <Badge variant={report.report_type === 'weekly' ? 'secondary' : 'default'}>
                    {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={handleBackToSelect}>
              이전
            </Button>
            <Button onClick={handleStartSend} className="gap-2">
              <Send className="h-4 w-4" />
              전송 시작
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step: select
  return (
    <div className="space-y-4">
      {unsentData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            미전송 리포트가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              미전송 리포트 {unsentData.length}개 중 전송할 항목을 선택하세요
            </p>
            {selectedReports.length > 0 && (
              <Button onClick={handleStartPreview} className="gap-2">
                <Send className="h-4 w-4" />
                {selectedReports.length}개 전송 준비
              </Button>
            )}
          </div>
          <ReportTableImproved
            data={unsentData}
            loading={loading}
            mode="select"
            onSendClick={() => {}}
            onDeleteClick={() => {}}
            onSelectionChange={handleSelectionChange}
          />
        </>
      )}
    </div>
  )
}
