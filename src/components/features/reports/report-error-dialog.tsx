'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Settings2, Wrench, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import type { ReportSendErrorInfo } from '@/lib/report-send-errors'

interface ReportErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorInfo: ReportSendErrorInfo | null
  failedReportName: string
}

export function ReportErrorDialog({
  open,
  onOpenChange,
  errorInfo,
  failedReportName,
}: ReportErrorDialogProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {errorInfo?.type === 'structural' && <Settings2 className="h-5 w-5 text-orange-600" />}
            {errorInfo?.type === 'recoverable' && <Wrench className="h-5 w-5 text-info" />}
            {errorInfo?.type === 'temporary' && <RefreshCw className="h-5 w-5 text-yellow-600" />}
            {errorInfo?.title || '전송 실패'}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2">
              {failedReportName && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{failedReportName}</span> 학생의 리포트 전송 중 문제가 발생했습니다.
                </p>
              )}

              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">문제 원인</p>
                  <p className="text-sm text-muted-foreground mt-1">{errorInfo?.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">해결 방법</p>
                  <p className="text-sm text-muted-foreground mt-1">{errorInfo?.solution}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  {errorInfo?.type === 'structural' && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      설정 필요
                    </Badge>
                  )}
                  {errorInfo?.type === 'recoverable' && (
                    <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                      조치 필요
                    </Badge>
                  )}
                  {errorInfo?.type === 'temporary' && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      일시적 오류
                    </Badge>
                  )}
                  {errorInfo?.canRetry && (
                    <span className="text-xs text-muted-foreground">다시 시도 가능</span>
                  )}
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {errorInfo?.helpLink && (
            <Button
              variant="outline"
              onClick={() => {
                router.push(errorInfo.helpLink!)
                onOpenChange(false)
              }}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              설정으로 이동
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errors: Array<{ name: string; error: ReportSendErrorInfo }>
  onClose: () => void
}

export function ReportBulkErrorDialog({
  open,
  onOpenChange,
  errors,
  onClose,
}: BulkErrorDialogProps) {
  const router = useRouter()

  const structural = errors.filter(e => e.error.type === 'structural')
  const recoverable = errors.filter(e => e.error.type === 'recoverable')
  const temporary = errors.filter(e => e.error.type === 'temporary')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            일괄 전송 중 오류 발생
          </DialogTitle>
          <DialogDescription>
            {errors.length}개의 리포트 전송 중 문제가 발생했습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {structural.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-700 text-sm">
                  설정 필요 ({structural.length}건)
                </span>
              </div>
              <p className="text-xs text-orange-600">{structural[0].error.solution}</p>
              <div className="text-xs text-orange-700">
                {structural.map((e, i) => (
                  <span key={i}>
                    {e.name}{i < structural.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
              {structural[0].error.helpLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    router.push(structural[0].error.helpLink!)
                    onOpenChange(false)
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  설정으로 이동
                </Button>
              )}
            </div>
          )}

          {recoverable.length > 0 && (
            <div className="rounded-lg border border-info/20 bg-info/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-info" />
                <span className="font-medium text-info text-sm">
                  조치 필요 ({recoverable.length}건)
                </span>
              </div>
              <p className="text-xs text-info">{recoverable[0].error.solution}</p>
              <div className="text-xs text-info">
                {recoverable.map((e, i) => (
                  <span key={i}>
                    {e.name}{i < recoverable.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
              {recoverable[0].error.helpLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-info/20 text-info hover:bg-info/10"
                  onClick={() => {
                    router.push(recoverable[0].error.helpLink!)
                    onOpenChange(false)
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  설정으로 이동
                </Button>
              )}
            </div>
          )}

          {temporary.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-700 text-sm">
                  일시적 오류 ({temporary.length}건)
                </span>
              </div>
              <p className="text-xs text-yellow-600">{temporary[0].error.solution}</p>
              <div className="text-xs text-yellow-700">
                {temporary.map((e, i) => (
                  <span key={i}>
                    {e.name}{i < temporary.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button onClick={onClose}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
