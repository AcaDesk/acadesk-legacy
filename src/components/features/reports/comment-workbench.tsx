'use client'

import { useState, useCallback } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { useToast } from '@/hooks/use-toast'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'
import { CommentEditor } from '@/components/features/reports/comment-editor'
import type { ReportWithStudent } from '@/core/types/report.types'

interface CommentWorkbenchProps {
  data: ReportWithStudent[]
  loading: boolean
  onComplete: () => void
}

type Step = 'select' | 'editing'

export function CommentWorkbench({ data, loading, onComplete }: CommentWorkbenchProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('select')
  const [selectedReports, setSelectedReports] = useState<ReportWithStudent[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleSelectionChange = useCallback((reports: ReportWithStudent[]) => {
    setSelectedReports(reports)
  }, [])

  function handleStartEditing() {
    if (selectedReports.length === 0) return
    setCurrentIndex(0)
    setStep('editing')
  }

  const handleSave = useCallback(async (reportId: string, comment: {
    summary: string
    strengths: string
    improvements: string
    nextGoals: string
  }) => {
    const { updateReportComment } = await import('@/app/actions/reports-send')
    const result = await updateReportComment(reportId, comment)
    if (!result.success) {
      throw new Error(result.error || '코멘트 저장에 실패했습니다.')
    }
    // Move to next
    if (currentIndex < selectedReports.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, selectedReports.length])

  function handleSkip() {
    if (currentIndex < selectedReports.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleEditingComplete()
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  function handleEditingComplete() {
    toast({ title: '코멘트 작성 완료', description: '모든 코멘트가 저장되었습니다.' })
    setStep('select')
    setSelectedReports([])
    setCurrentIndex(0)
    onComplete()
  }

  if (step === 'editing' && selectedReports.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
            목록으로 돌아가기
          </Button>
        </div>
        <CommentEditor
          reports={selectedReports}
          currentIndex={currentIndex}
          onSave={handleSave}
          onSkip={handleSkip}
          onPrevious={handlePrevious}
          onComplete={handleEditingComplete}
        />
      </div>
    )
  }

  // Step: select
  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            코멘트를 작성할 리포트가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              코멘트를 작성할 리포트를 선택하세요
            </p>
            {selectedReports.length > 0 && (
              <Button onClick={handleStartEditing} className="gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                {selectedReports.length}개 코멘트 작성 시작
              </Button>
            )}
          </div>
          <ReportTableImproved
            data={data}
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
