'use client'

import { AlertTriangle, Send, Info, Loader2 } from 'lucide-react'
import { Button } from '@ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Label } from '@ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { ReportErrorDialog, ReportBulkErrorDialog } from '@/components/features/reports/report-error-dialog'
import type { ReportActionsState, ReportActionsHandlers } from '@/hooks/use-report-actions'
import {
  type ReportSendChannel,
  REPORT_SEND_CHANNEL_LABELS,
} from '@/app/(dashboard)/reports/new/stepper/use-report-stepper'
import type { KakaoTemplate } from '@/app/actions/messaging/kakao-templates'

type ReportDialogsProps = Pick<
  ReportActionsState & ReportActionsHandlers,
  | 'sendDialogOpen'
  | 'setSendDialogOpen'
  | 'reportToSend'
  | 'isSending'
  | 'handleConfirmSend'
  | 'deleteDialogOpen'
  | 'setDeleteDialogOpen'
  | 'reportToDelete'
  | 'isDeleting'
  | 'handleConfirmDelete'
  | 'bulkDeleteDialogOpen'
  | 'setBulkDeleteDialogOpen'
  | 'reportsToDelete'
  | 'isBulkDeleting'
  | 'handleConfirmBulkDelete'
  | 'bulkSendDialogOpen'
  | 'setBulkSendDialogOpen'
  | 'reportsToSend'
  | 'isBulkSending'
  | 'bulkSendProgress'
  | 'handleConfirmBulkSend'
  | 'sendChannel'
  | 'setSendChannel'
  | 'hasKakaoChannel'
  | 'checkingKakaoChannel'
  | 'kakaoTemplates'
  | 'loadingKakaoTemplates'
  | 'errorDialogOpen'
  | 'setErrorDialogOpen'
  | 'errorInfo'
  | 'failedReportName'
  | 'bulkErrorDialogOpen'
  | 'setBulkErrorDialogOpen'
  | 'bulkSendErrors'
  | 'clearBulkSendErrors'
>

function reportTypeLabel(reportType: string): string {
  if (reportType === 'monthly') return '월간'
  if (reportType === 'weekly') return '주간'
  if (reportType === 'quarterly') return '분기'
  return reportType
}

function eventTypeForReport(reportType: string): string | null {
  if (reportType === 'monthly') return 'monthly_report_ready'
  if (reportType === 'weekly') return 'weekly_report_ready'
  return null
}

function findTemplate(templates: KakaoTemplate[], reportType: string): KakaoTemplate | null {
  const ev = eventTypeForReport(reportType)
  if (!ev) return null
  return templates.find((t) => t.eventType === ev) ?? null
}

function ChannelSelect({
  value,
  onChange,
  hasKakaoChannel,
  checkingKakaoChannel,
  disabled,
}: {
  value: ReportSendChannel
  onChange: (v: ReportSendChannel) => void
  hasKakaoChannel: boolean
  checkingKakaoChannel: boolean
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>발송 채널</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ReportSendChannel)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="발송 채널 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sms">문자 (SMS/LMS 자동)</SelectItem>
          <SelectItem value="lms">LMS</SelectItem>
          <SelectItem value="kakao" disabled={!hasKakaoChannel || checkingKakaoChannel}>
            카카오 알림톡
            {!hasKakaoChannel && !checkingKakaoChannel ? ' (채널 연동 필요)' : ''}
          </SelectItem>
        </SelectContent>
      </Select>
      {checkingKakaoChannel && (
        <p className="text-xs text-muted-foreground">알림톡 채널 연동 상태를 확인 중입니다.</p>
      )}
    </div>
  )
}

export function ReportDialogs(props: ReportDialogsProps) {
  const singleMatched =
    props.reportToSend && props.sendChannel === 'kakao'
      ? findTemplate(props.kakaoTemplates, props.reportToSend.reportType)
      : null
  const singleMatchedMissing =
    props.sendChannel === 'kakao' && !!props.reportToSend && !singleMatched && !props.loadingKakaoTemplates

  // 일괄 전송: 선택된 리포트 종류별 매칭 템플릿 요약
  const bulkTypeSummary: Array<{
    type: string
    label: string
    count: number
    template: KakaoTemplate | null
  }> = (() => {
    if (props.sendChannel !== 'kakao') return []
    const buckets = new Map<string, { count: number; type: string }>()
    for (const r of props.reportsToSend) {
      const cur = buckets.get(r.report_type) ?? { count: 0, type: r.report_type }
      cur.count++
      buckets.set(r.report_type, cur)
    }
    return Array.from(buckets.values()).map((b) => ({
      type: b.type,
      label: reportTypeLabel(b.type),
      count: b.count,
      template: findTemplate(props.kakaoTemplates, b.type),
    }))
  })()

  const bulkHasMissing =
    props.sendChannel === 'kakao' && !props.loadingKakaoTemplates && bulkTypeSummary.some((b) => !b.template)

  return (
    <>
      {/* Single Send Dialog (channel selectable) */}
      <Dialog open={props.sendDialogOpen} onOpenChange={props.setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>리포트를 전송하시겠습니까?</DialogTitle>
            <DialogDescription>
              {props.reportToSend
                ? `"${props.reportToSend.name}" 학생의 ${reportTypeLabel(props.reportToSend.reportType)} 리포트가 모든 보호자에게 전송됩니다.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ChannelSelect
              value={props.sendChannel}
              onChange={props.setSendChannel}
              hasKakaoChannel={props.hasKakaoChannel}
              checkingKakaoChannel={props.checkingKakaoChannel}
              disabled={props.isSending}
            />

            {props.sendChannel === 'kakao' && props.reportToSend && (
              <div className="space-y-2">
                <Label>알림톡 템플릿</Label>
                {props.loadingKakaoTemplates ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    템플릿 확인 중...
                  </div>
                ) : singleMatched ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium">{singleMatched.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reportTypeLabel(props.reportToSend.reportType)} 리포트 종류에 맞춰 자동 선택됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {reportTypeLabel(props.reportToSend.reportType)} 리포트에 매칭된 승인 템플릿이 없습니다. 설정 &gt;
                      카카오 알림톡 템플릿에서 등록해주세요.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => props.setSendDialogOpen(false)}
              disabled={props.isSending}
            >
              취소
            </Button>
            <Button
              onClick={props.handleConfirmSend}
              disabled={props.isSending || singleMatchedMissing}
            >
              {props.isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={props.deleteDialogOpen}
        onOpenChange={props.setDeleteDialogOpen}
        title="리포트를 삭제하시겠습니까?"
        description={props.reportToDelete ? `"${props.reportToDelete.name}" 학생의 리포트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={props.isDeleting}
        onConfirm={props.handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={props.bulkDeleteDialogOpen}
        onOpenChange={props.setBulkDeleteDialogOpen}
        title={`${props.reportsToDelete.length}개의 리포트를 삭제하시겠습니까?`}
        description={
          <div className="space-y-2">
            <p>선택한 리포트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            {props.reportsToDelete.length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  삭제될 리포트:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {props.reportsToDelete.slice(0, 5).map((report) => (
                    <li key={report.id}>
                      {report.students?.users?.name || '이름 없음'} - {reportTypeLabel(report.report_type)}
                    </li>
                  ))}
                  {props.reportsToDelete.length > 5 && (
                    <li>외 {props.reportsToDelete.length - 5}개...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        }
        confirmText={`${props.reportsToDelete.length}개 삭제`}
        variant="destructive"
        isLoading={props.isBulkDeleting}
        onConfirm={props.handleConfirmBulkDelete}
      />

      {/* Bulk Send Dialog (channel selectable) */}
      <Dialog open={props.bulkSendDialogOpen} onOpenChange={props.setBulkSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{props.reportsToSend.length}개의 리포트를 전송하시겠습니까?</DialogTitle>
            <DialogDescription>선택한 리포트가 각 학생의 모든 보호자에게 전송됩니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ChannelSelect
              value={props.sendChannel}
              onChange={props.setSendChannel}
              hasKakaoChannel={props.hasKakaoChannel}
              checkingKakaoChannel={props.checkingKakaoChannel}
              disabled={props.isBulkSending}
            />

            {props.sendChannel === 'kakao' && (
              <div className="space-y-2">
                <Label>알림톡 템플릿 매칭</Label>
                {props.loadingKakaoTemplates ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    템플릿 확인 중...
                  </div>
                ) : bulkTypeSummary.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    선택된 리포트가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {bulkTypeSummary.map((b) => (
                      <div
                        key={b.type}
                        className={
                          'rounded-md border px-3 py-2 text-sm ' +
                          (b.template
                            ? 'bg-muted/30'
                            : 'border-destructive/40 bg-destructive/5 text-destructive')
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {b.label} 리포트 ({b.count}건)
                          </span>
                          <span className="text-xs">
                            {b.template ? `→ ${b.template.name}` : '매칭 템플릿 없음'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {bulkHasMissing && (
                      <p className="text-xs text-destructive">
                        매칭 템플릿이 없는 종류가 있어 전송할 수 없습니다. 설정 &gt; 카카오 알림톡 템플릿에서 등록해주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {props.reportsToSend.length > 0 && (
              <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  전송될 리포트:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {props.reportsToSend.slice(0, 5).map((report) => (
                    <li key={report.id}>
                      {report.students?.users?.name || '이름 없음'} - {reportTypeLabel(report.report_type)}
                    </li>
                  ))}
                  {props.reportsToSend.length > 5 && (
                    <li>외 {props.reportsToSend.length - 5}개...</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => props.setBulkSendDialogOpen(false)}
              disabled={props.isBulkSending}
            >
              취소
            </Button>
            <Button
              onClick={props.handleConfirmBulkSend}
              disabled={props.isBulkSending || bulkHasMissing}
            >
              {props.isBulkSending && props.bulkSendProgress.total > 0 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중... ({props.bulkSendProgress.current}/{props.bulkSendProgress.total})
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {props.reportsToSend.length}개 전송
                  {props.sendChannel === 'kakao' ? ` (${REPORT_SEND_CHANNEL_LABELS.kakao})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Information Dialog */}
      <ReportErrorDialog
        open={props.errorDialogOpen}
        onOpenChange={props.setErrorDialogOpen}
        errorInfo={props.errorInfo}
        failedReportName={props.failedReportName}
      />

      {/* Bulk Send Errors Dialog */}
      <ReportBulkErrorDialog
        open={props.bulkErrorDialogOpen}
        onOpenChange={props.setBulkErrorDialogOpen}
        errors={props.bulkSendErrors}
        onClose={props.clearBulkSendErrors}
      />
    </>
  )
}
