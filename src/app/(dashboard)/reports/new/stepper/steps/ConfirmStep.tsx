'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription } from '@ui/alert'
import { ChevronLeft, Loader2, Send, Save, X } from 'lucide-react'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import { cn } from '@/lib/utils'
import type { ReportData } from '@/core/types/report.types'

interface ConfirmStepProps {
  previewData: ReportData | null
  sendAfterSave: boolean
  onSendAfterSaveChange: (v: boolean) => void
  generating: boolean
  sending: boolean
  isReady: boolean
  onSubmit: () => Promise<void>
  onBack: () => void
}

export function ConfirmStep({
  previewData,
  sendAfterSave,
  onSendAfterSaveChange,
  generating,
  sending,
  isReady,
  onSubmit,
  onBack,
}: ConfirmStepProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const isProcessing = generating || sending

  const sendOptions = [
    {
      value: false,
      label: '저장만',
      description: '나중에 리포트 상세 페이지에서 전송할 수 있습니다',
    },
    {
      value: true,
      label: '저장 후 즉시 전송',
      description: '등록된 보호자에게 SMS/LMS로 즉시 발송합니다',
    },
  ]

  if (!previewData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          미리볼 데이터가 없습니다. 이전 단계를 완료해주세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notice */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <Alert>
            <AlertDescription>
              아래 내용은 보호자에게 전달될 최종 리포트입니다. 수정이 필요하면 &quot;이전&quot;
              버튼으로 돌아가세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Report preview */}
      <ReportViewer reportData={previewData} showEditButton={false} />

      {/* Send option + actions */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            전송 방식
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sendOptions.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onSendAfterSaveChange(option.value)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                  sendAfterSave === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                    sendAfterSave === option.value ? 'border-primary' : 'border-muted-foreground'
                  )}
                >
                  {sendAfterSave === option.value && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="outline" onClick={onBack} disabled={isProcessing} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelOpen(true)}
                disabled={isProcessing}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                취소
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
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          sendAfterSave ? '리포트를 저장하고 전송하시겠습니까?' : '리포트를 저장하시겠습니까?'
        }
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

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="리포트 작성을 취소하시겠습니까?"
        description="작성 중인 내용은 저장되지 않습니다."
        confirmText="취소하고 나가기"
        variant="destructive"
        onConfirm={() => router.push('/reports')}
      />
    </div>
  )
}
