'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Save,
} from 'lucide-react'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import type { SelectedStudent } from '../report-stepper-types'

interface SubmitStepProps {
  student: SelectedStudent | null
  periodLabel: string | null
  commentProgress: number
  dataLoaded: boolean
  warningCount: number
  sendAfterSave: boolean
  onSendAfterSaveChange: (v: boolean) => void
  generating: boolean
  sending: boolean
  isReady: boolean
  onSubmit: () => Promise<void>
  onBack: () => void
}

export function SubmitStep({
  student,
  periodLabel,
  commentProgress,
  dataLoaded,
  warningCount,
  sendAfterSave,
  onSendAfterSaveChange,
  generating,
  sending,
  isReady,
  onSubmit,
  onBack,
}: SubmitStepProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isProcessing = generating || sending

  const checks = [
    { label: '학생 선택', ok: !!student, detail: student?.name || '미선택' },
    { label: '기간 설정', ok: !!periodLabel, detail: periodLabel || '미설정' },
    { label: '데이터 수집', ok: dataLoaded, detail: dataLoaded ? (warningCount > 0 ? `경고 ${warningCount}건` : '완료') : '미완료' },
    { label: '코멘트 작성', ok: commentProgress >= 1, detail: `${commentProgress}/4 작성` },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>리포트 생성</CardTitle>
        <CardDescription>모든 단계가 완료되었는지 확인 후 리포트를 저장하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation summary */}
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-3">
              {check.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{check.label}</span>
                <span className="text-sm text-muted-foreground ml-2">{check.detail}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Send option */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
          <Checkbox
            id="send-after-save"
            checked={sendAfterSave}
            onCheckedChange={(checked) => onSendAfterSaveChange(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="send-after-save" className="font-medium cursor-pointer">
              저장 후 보호자에게 즉시 전송
            </Label>
            <p className="text-xs text-muted-foreground">
              등록된 보호자에게 SMS/LMS로 리포트 링크를 발송합니다
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} disabled={isProcessing} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!isReady || isProcessing}
            size="lg"
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {sending ? '전송 중...' : '저장 중...'}
              </>
            ) : sendAfterSave ? (
              <>
                <Send className="h-4 w-4" />
                저장 및 전송
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                리포트 저장
              </>
            )}
          </Button>
        </div>

        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={sendAfterSave ? '리포트를 저장하고 전송하시겠습니까?' : '리포트를 저장하시겠습니까?'}
          description={
            sendAfterSave
              ? '리포트가 저장되고 등록된 보호자에게 즉시 전송됩니다.'
              : '리포트가 저장됩니다. 나중에 리포트 상세 페이지에서 전송할 수 있습니다.'
          }
          confirmText={sendAfterSave ? '저장 및 전송' : '저장'}
          variant="default"
          isLoading={isProcessing}
          onConfirm={async () => {
            await onSubmit()
            setConfirmOpen(false)
          }}
        />
      </CardContent>
    </Card>
  )
}
