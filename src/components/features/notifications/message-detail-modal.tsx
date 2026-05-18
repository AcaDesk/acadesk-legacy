'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import {
  CheckCircle,
  XCircle,
  User,
  Phone,
  Hash,
  MessageSquare,
  Clock,
  AlertCircle,
  FlaskConical,
  ArrowRight,
  Info,
} from 'lucide-react'
import { KakaoTalkPreview } from '@/components/features/messaging/KakaoTalkPreview'

interface NotificationLog {
  id: string
  student_id: string | null
  notification_type: string
  status: string
  message: string
  subject: string | null
  sent_at: string
  error_message: string | null
  is_test: boolean
  recipient_name: string | null
  recipient_phone: string | null
  event_type: string | null
  kakao_template_id: string | null
  original_channel: string | null
  fallback_type: string | null
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

  const studentName = log.students?.users?.name
  const studentPhone = log.students?.users?.phone
  const recipientName = log.recipient_name
  const recipientPhone = log.recipient_phone || studentPhone
  const isKakao = log.notification_type === 'kakao'
  const isFallback = log.original_channel === 'kakao' && log.notification_type !== 'kakao'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            메시지 상세
            {log.is_test && (
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 gap-1">
                <FlaskConical className="h-3 w-3" />
                테스트 발송
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 상태 & 유형 */}
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(log.status)}
            {isFallback ? (
              <div className="flex items-center gap-1">
                <Badge variant="default" className="bg-yellow-500 text-black opacity-60 line-through">알림톡</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                {getTypeBadge(log.notification_type)}
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Info className="h-2.5 w-2.5" />
                  SMS 대체 발송
                </Badge>
              </div>
            ) : (
              getTypeBadge(log.notification_type)
            )}
            {log.event_type && (
              <Badge variant="outline" className="text-xs">
                {log.event_type}
              </Badge>
            )}
          </div>

          {isFallback && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              알림톡으로 발송 시도했으나 수신 불가 등의 이유로 SMS로 자동 대체되었습니다.
            </div>
          )}

          <Separator />

          {/* 수신자 정보 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">수신자</p>
            <div className="space-y-1.5">
              {log.is_test ? (
                <div className="flex items-center gap-2 text-sm">
                  <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{recipientName || '테스트 수신자'}</span>
                </div>
              ) : studentName ? (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{studentName}</span>
                  {recipientName && (
                    <span className="text-muted-foreground">→ {recipientName}</span>
                  )}
                </div>
              ) : recipientName ? (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{recipientName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>수신자 정보 없음</span>
                </div>
              )}
              {log.students?.student_code && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4 shrink-0" />
                  <span>{log.students.student_code}</span>
                </div>
              )}
              {recipientPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{recipientPhone}</span>
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

          {/* 제목 (LMS) */}
          {log.subject && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">제목</p>
                <p className="text-sm">{log.subject}</p>
              </div>
            </>
          )}

          <Separator />

          {/* 메시지 내용 — 알림톡은 카카오 미리보기, 그 외는 일반 텍스트 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isKakao ? '알림톡 미리보기' : '메시지 내용'}
            </p>
            {isKakao && log.message ? (
              <KakaoTalkPreview
                content={log.message}
                showVariableMap={false}
              />
            ) : log.message ? (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{log.message}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">메시지 내용이 기록되지 않았습니다.</p>
            )}
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
