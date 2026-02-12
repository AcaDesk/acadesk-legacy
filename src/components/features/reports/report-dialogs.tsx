'use client'

import { AlertTriangle, Send } from 'lucide-react'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { ReportErrorDialog, ReportBulkErrorDialog } from '@/components/features/reports/report-error-dialog'
import type { ReportActionsState, ReportActionsHandlers } from '@/hooks/use-report-actions'

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
  | 'errorDialogOpen'
  | 'setErrorDialogOpen'
  | 'errorInfo'
  | 'failedReportName'
  | 'bulkErrorDialogOpen'
  | 'setBulkErrorDialogOpen'
  | 'bulkSendErrors'
  | 'clearBulkSendErrors'
>

export function ReportDialogs(props: ReportDialogsProps) {
  return (
    <>
      {/* Send Confirmation Dialog */}
      <ConfirmationDialog
        open={props.sendDialogOpen}
        onOpenChange={props.setSendDialogOpen}
        title="리포트를 전송하시겠습니까?"
        description={props.reportToSend ? `"${props.reportToSend.name}" 학생의 리포트가 모든 보호자에게 전송됩니다.` : ''}
        confirmText="전송"
        variant="default"
        isLoading={props.isSending}
        onConfirm={props.handleConfirmSend}
      />

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
                      {report.students?.users?.name || '이름 없음'} - {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
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

      {/* Bulk Send Confirmation Dialog */}
      <ConfirmationDialog
        open={props.bulkSendDialogOpen}
        onOpenChange={props.setBulkSendDialogOpen}
        title={`${props.reportsToSend.length}개의 리포트를 전송하시겠습니까?`}
        description={
          <div className="space-y-2">
            <p>선택한 리포트가 각 학생의 모든 보호자에게 전송됩니다.</p>
            {props.reportsToSend.length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  전송될 리포트:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {props.reportsToSend.slice(0, 5).map((report) => (
                    <li key={report.id}>
                      {report.students?.users?.name || '이름 없음'} - {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
                    </li>
                  ))}
                  {props.reportsToSend.length > 5 && (
                    <li>외 {props.reportsToSend.length - 5}개...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        }
        confirmText={
          props.isBulkSending && props.bulkSendProgress.total > 0
            ? `전송 중... (${props.bulkSendProgress.current}/${props.bulkSendProgress.total})`
            : `${props.reportsToSend.length}개 전송`
        }
        variant="default"
        isLoading={props.isBulkSending}
        onConfirm={props.handleConfirmBulkSend}
      />

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
