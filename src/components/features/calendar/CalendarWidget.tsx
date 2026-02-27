'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarEvent, EventType } from '@/core/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'
import Link from 'next/link'

// 이벤트 타입별 Tailwind 색상 클래스 (AcademyCalendar와 동일)
const EVENT_TYPE_COLORS: Record<EventType, string> = {
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

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface CalendarWidgetProps {
  className?: string
}

export function CalendarWidget({ className = '' }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const supabase = createClient()
  const today = useMemo(() => new Date(), [])

  // 현재 월 이벤트 로드
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const start = startOfMonth(currentDate)
        const end = endOfMonth(currentDate)

        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .is('deleted_at', null)
          .gte('start_at', start.toISOString())
          .lte('start_at', end.toISOString())
          .order('start_at', { ascending: true })

        if (error) throw error
        setEvents(data || [])
      } catch (error) {
        console.error('Failed to load events:', error)
      }
    }

    loadEvents()
  }, [currentDate, supabase])

  // 월 그리드 계산 (AcademyCalendar와 동일 로직)
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = startOfMonth(new Date(year, month))
    const startDow = firstDay.getDay()

    const grid: { date: Date; isCurrentMonth: boolean }[] = []

    for (let i = 0; i < startDow; i++) {
      grid.push({ date: new Date(year, month, 1 - (startDow - i)), isCurrentMonth: false })
    }

    const lastDate = endOfMonth(firstDay).getDate()
    for (let d = 1; d <= lastDate; d++) {
      grid.push({ date: new Date(year, month, d), isCurrentMonth: true })
    }

    const targetLen = grid.length > 35 ? 42 : 35
    let nextDay = 1
    while (grid.length < targetLen) {
      grid.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false })
    }

    return grid
  }, [currentDate])

  const getEventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_at), date))

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const getEventColor = (event: CalendarEvent) =>
    EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.other

  const handlePrev = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
    setSelectedDate(null)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
    setSelectedDate(null)
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-900 dark:text-white">캘린더</span>
          <Link
            href="/calendar"
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="전체 캘린더 보기"
          >
            <ExternalLink size={14} />
          </Link>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={handlePrev}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ChevronLeft size={15} className="text-gray-500 dark:text-gray-400" />
          </button>
          <span className="flex-1 text-xs font-bold text-center text-gray-900 dark:text-white">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </span>
          <button
            onClick={handleNext}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ChevronRight size={15} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="p-3">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-[10px] font-bold py-1 ${
                i === 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div
          className="grid grid-cols-7"
          style={{ gridTemplateRows: `repeat(${monthGrid.length / 7}, auto)` }}
        >
          {monthGrid.map(({ date, isCurrentMonth }, idx) => {
            const dayEvents = getEventsForDate(date)
            const hasEvents = dayEvents.length > 0
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isToday_ = isSameDay(date, today)
            const isSun = date.getDay() === 0

            return (
              <button
                key={idx}
                onClick={() =>
                  setSelectedDate(isSelected ? null : date)
                }
                className="flex flex-col items-center py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                    isToday_
                      ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold'
                      : isSelected
                        ? 'bg-gray-200 dark:bg-gray-600 font-bold text-gray-900 dark:text-white'
                        : !isCurrentMonth
                          ? 'text-gray-300 dark:text-gray-600'
                          : isSun
                            ? 'text-red-500'
                            : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* 이벤트 도트 */}
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const config = EVENT_TYPE_CONFIG[event.event_type]
                      return (
                        <div
                          key={event.id}
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: event.color || config.color }}
                        />
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 날짜 이벤트 목록 */}
      {selectedDate && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-2">
            {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
          </p>
          {selectedDateEvents.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-1">일정이 없습니다</p>
          ) : (
            selectedDateEvents.map((event) => (
              <Link key={event.id} href="/calendar">
                <div
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(event)}`}
                >
                  {!event.all_day && (
                    <span className="opacity-70 mr-1">
                      {format(new Date(event.start_at), 'HH:mm')}
                    </span>
                  )}
                  {event.title}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
