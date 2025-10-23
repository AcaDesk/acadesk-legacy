'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Separator } from '@ui/separator'
import {
  Calendar,
  Clock,
  FileText,
  User,
  Users,
  BookOpen,
  Edit,
  Trash2,
} from 'lucide-react'
import type { CalendarEvent, EventType } from '@/core/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'

interface EventDetailModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
}

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  if (!event) return null

  const eventTypeConfig = EVENT_TYPE_CONFIG[event.event_type as EventType]
  const startDate = new Date(event.start_at)
  const endDate = new Date(event.end_at)

  const formatDateTime = (date: Date) => {
    if (event.all_day) {
      return format(date, 'yyyy년 M월 d일 (EEE)', { locale: ko })
    }
    return format(date, 'yyyy년 M월 d일 (EEE) HH:mm', { locale: ko })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{event.title}</DialogTitle>
          <DialogDescription asChild>
            <span className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: event.color || eventTypeConfig.color,
                  color: 'white',
                }}
              >
                {eventTypeConfig.label}
              </Badge>
              {event.all_day && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  종일
                </Badge>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          {/* 시간 정보 */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">시작</p>
              <p className="text-muted-foreground">{formatDateTime(startDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">종료</p>
              <p className="text-muted-foreground">{formatDateTime(endDate)}</p>
            </div>
          </div>

          {/* 설명 */}
          {event.description && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">설명</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* 연관 정보 */}
          {event.class_id && (
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">수업</p>
                <p className="text-muted-foreground">수업 ID: {event.class_id}</p>
              </div>
            </div>
          )}

          {event.student_id && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">학생</p>
                <p className="text-muted-foreground">학생 ID: {event.student_id}</p>
              </div>
            </div>
          )}

          {event.guardian_id && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">보호자</p>
                <p className="text-muted-foreground">보호자 ID: {event.guardian_id}</p>
              </div>
            </div>
          )}

          {/* 알림 */}
          {event.reminder_minutes && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">알림</p>
                <p className="text-muted-foreground">
                  {event.reminder_minutes}분 전에 알림
                </p>
              </div>
            </div>
          )}

          {/* 반복 일정 */}
          {event.recurrence_rule && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">반복</p>
                <p className="text-muted-foreground">{event.recurrence_rule}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            생성: {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm')}
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(event)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            )}
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onEdit(event)
                  onOpenChange(false)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
