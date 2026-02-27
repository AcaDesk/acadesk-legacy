'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { X, Clock, MapPin, FileText, Edit2, Trash2, RefreshCw } from 'lucide-react'
import type { CalendarEvent, EventType } from '@/core/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'

interface EventDetailModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
}

// 이벤트 타입별 배지 색상 클래스
const TYPE_BADGE_COLORS: Record<EventType, string> = {
  class:
    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
  exam: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300',
  consultation:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
  payment_due:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  task_due:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300',
  birthday:
    'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:border-pink-800 dark:text-pink-300',
  holiday:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  event:
    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300',
  other:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
}

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  if (!event || !open) return null

  const config = EVENT_TYPE_CONFIG[event.event_type as EventType]
  const badgeColor = TYPE_BADGE_COLORS[event.event_type as EventType] ?? TYPE_BADGE_COLORS.other
  const startDate = new Date(event.start_at)
  const endDate = new Date(event.end_at)

  const formatDateTime = (date: Date) => {
    if (event.all_day) return format(date, 'yyyy년 M월 d일 (EEE)', { locale: ko })
    return format(date, 'yyyy년 M월 d일 (EEE) HH:mm', { locale: ko })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-col gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit border ${badgeColor}`}
            >
              {config.label}
            </span>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight pr-4">
              {event.title}
            </h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4">
          {/* 일시 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">일시</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatDateTime(startDate)}
                {!event.all_day && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    {' '}~ {format(endDate, 'HH:mm')}
                  </span>
                )}
              </p>
              {event.all_day && (
                <p className="text-xs text-gray-400 dark:text-gray-500">~ {formatDateTime(endDate)}</p>
              )}
            </div>
          </div>

          {/* 장소 (meta.location이 있을 경우) */}
          {typeof event.meta?.location === 'string' && event.meta.location && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">장소</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {event.meta.location}
                </p>
              </div>
            </div>
          )}

          {/* 알림 */}
          {event.reminder_minutes != null && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">알림</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {event.reminder_minutes === 0 ? '일정 시작 시' : `${event.reminder_minutes}분 전`}
                </p>
              </div>
            </div>
          )}

          {/* 반복 */}
          {event.recurrence_rule && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
                <RefreshCw size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">반복</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {event.recurrence_rule.includes('FREQ=DAILY')
                    ? '매일 반복'
                    : event.recurrence_rule.includes('FREQ=WEEKLY')
                      ? '매주 반복'
                      : event.recurrence_rule.includes('FREQ=MONTHLY')
                        ? '매월 반복'
                        : '반복 일정'}
                </p>
              </div>
            </div>
          )}

          {/* 설명 */}
          {event.description && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">상세 내용</p>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-2">
          {onDelete && (
            <button
              onClick={() => {
                onDelete(event)
                onOpenChange(false)
              }}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors"
              title="삭제"
            >
              <Trash2 size={18} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => {
                onEdit(event)
                onOpenChange(false)
              }}
              className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 size={16} />
              수정하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
