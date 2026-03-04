'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { CheckCircle, XCircle, User, Phone, Hash, MessageSquare, Clock, AlertCircle } from 'lucide-react'

interface NotificationLog {
  id: string
  student_id: string
  notification_type: string
  status: string
  message: string
  sent_at: string
  error_message: string | null
  students: {
    student_code: string
    users: {
      name: string
      phone: string | null
    } | null
  } | null
}

interface MessageDetailModalProps {
  log: NotificationLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'sent':
      return (
        <Badge variant="outline" className="bg-success/10">
          <CheckCircle className="h-3 w-3 mr-1" />
          전송 완료
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          전송 실패
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'sms':
      return <Badge variant="default">SMS</Badge>
    case 'lms':
      return <Badge variant="default" className="bg-info">LMS</Badge>
    case 'mms':
      return <Badge variant="default" className="bg-purple-600">MMS</Badge>
    case 'kakao':
      return <Badge variant="default" className="bg-yellow-500 text-black">알림톡</Badge>
    case 'email':
      return <Badge variant="default" className="bg-gray-600">이메일</Badge>
    default:
      return <Badge variant="secondary">{type.toUpperCase()}</Badge>
  }
}

export function MessageDetailModal({ log, open, onOpenChange }: MessageDetailModalProps) {
  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>메시지 상세</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 상태 & 유형 */}
          <div className="flex items-center gap-2">
            {getStatusBadge(log.status)}
            {getTypeBadge(log.notification_type)}
          </div>

          <Separator />

          {/* 수신자 정보 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">수신자</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{log.students?.users?.name || '이름 없음'}</span>
              </div>
              {log.students?.student_code && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4 shrink-0" />
                  <span>{log.students.student_code}</span>
                </div>
              )}
              {log.students?.users?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{log.students.users.phone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 전송 일시 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">전송 일시</p>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{new Date(log.sent_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>

          <Separator />

          {/* 메시지 내용 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">메시지 내용</p>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{log.message}</p>
            </div>
          </div>

          {/* 오류 메시지 (실패 시) */}
          {log.error_message && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">오류 정보</p>
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive break-words">{log.error_message}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
