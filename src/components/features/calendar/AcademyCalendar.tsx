'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutList,
  Link2,
  Check,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { format, isSameDay, startOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import type { CalendarEvent, EventType } from '@/core/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'

// 이벤트 타입별 Tailwind 색상 클래스
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

interface AcademyCalendarProps {
  events: CalendarEvent[]
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (info: { start: Date; end: Date; action: string }) => void
  onAddEvent?: () => void
  className?: string
}

export function AcademyCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onAddEvent,
  className = '',
}: AcademyCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const today = useMemo(() => new Date(), [])

  // 이전/다음 이동
  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  const handleToday = () => setCurrentDate(new Date())

  const toggleGoogleSync = () => {
    if (isGoogleConnected) {
      setIsGoogleConnected(false)
    } else {
      setIsSyncing(true)
      setTimeout(() => {
        setIsSyncing(false)
        toast({
          title: 'Google 캘린더 연동',
          description: '곧 지원될 예정입니다.',
        })
      }, 800)
    }
  }

  // 주간 뷰: 이번 주 7일
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  // 월간 뷰: 달력 그리드 (35 or 42칸)
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = startOfMonth(new Date(year, month))
    const startDow = firstDay.getDay()

    const grid: { date: Date; isCurrentMonth: boolean }[] = []

    // 이전달 채우기
    for (let i = 0; i < startDow; i++) {
      grid.push({
        date: new Date(year, month, 1 - (startDow - i)),
        isCurrentMonth: false,
      })
    }

    // 이번달
    const lastDate = endOfMonth(firstDay).getDate()
    for (let d = 1; d <= lastDate; d++) {
      grid.push({ date: new Date(year, month, d), isCurrentMonth: true })
    }

    // 다음달 채우기
    const targetLen = grid.length > 35 ? 42 : 35
    let nextDay = 1
    while (grid.length < targetLen) {
      grid.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false })
    }

    return grid
  }, [currentDate])

  // 특정 날짜의 이벤트 조회
  const getEventsForDate = useCallback(
    (date: Date) => events.filter((e) => isSameDay(new Date(e.start_at), date)),
    [events]
  )

  // 이벤트 색상 클래스
  const getEventColor = (event: CalendarEvent) =>
    EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.other

  // 날짜 클릭 → 해당 날짜 09:00~10:00로 슬롯 선택
  const handleDateClick = (date: Date) => {
    const start = new Date(date)
    start.setHours(9, 0, 0, 0)
    const end = new Date(date)
    end.setHours(10, 0, 0, 0)
    onSelectSlot?.({ start, end, action: 'click' })
  }

  // 시간 슬롯 (09:00 ~ 22:00)
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 9)

  // 툴바 월 표시 텍스트
  const headerLabel =
    viewMode === 'month'
      ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
      : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${weekDays[0].getDate()}일 ~ ${weekDays[6].getDate()}일`

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] gap-4 ${className}`}>
      {/* ── 툴바 ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        {/* 왼쪽: 네비게이션 + 뷰 전환 */}
        <div className="flex items-center gap-3">
          {/* 이전/다음 + 월 표시 */}
          <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-bold px-3 text-foreground min-w-[180px] text-center">
              {headerLabel}
            </span>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* 오늘 버튼 */}
          <button
            onClick={handleToday}
            className="text-xs font-bold text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            오늘
          </button>

          <div className="h-6 w-px bg-border" />

          {/* 월/주 뷰 전환 */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="월간"
            >
              <CalendarIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="주간"
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>

        {/* 오른쪽: Google 연동 + 일정 등록 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleGoogleSync}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              isGoogleConnected
                ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : isGoogleConnected ? (
              <Check size={16} strokeWidth={3} />
            ) : (
              <Link2 size={16} />
            )}
            {isSyncing ? '동기화 중...' : isGoogleConnected ? 'Google 연동됨' : 'Google 캘린더'}
          </button>

          <button
            onClick={onAddEvent}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:opacity-90 transition-colors"
          >
            <Plus size={16} />
            일정 등록
          </button>
        </div>
      </div>

      {/* ── 캘린더 본체 ── */}
      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-0">
        {/* ── 월간 뷰 ── */}
        {viewMode === 'month' && (
          <>
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/50 shrink-0">
              {DAY_LABELS.map((day, i) => (
                <div
                  key={day}
                  className={`py-3 text-center text-xs font-bold ${
                    i === 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div
              className="flex-1 grid grid-cols-7 min-h-0"
              style={{
                gridTemplateRows: `repeat(${monthGrid.length / 7}, minmax(0, 1fr))`,
              }}
            >
              {monthGrid.map(({ date, isCurrentMonth }, idx) => {
                const dayEvents = getEventsForDate(date)
                const isToday = isSameDay(date, today)
                const isSun = date.getDay() === 0

                return (
                  <div
                    key={idx}
                    className={`border-b border-r border-border/50 p-2 relative group hover:bg-muted/30 transition-colors overflow-hidden ${
                      !isCurrentMonth ? 'bg-muted/20' : ''
                    }`}
                  >
                    {/* 날짜 숫자 */}
                    <span
                      className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        isToday
                          ? 'bg-foreground text-background font-extrabold'
                          : !isCurrentMonth
                            ? 'text-muted-foreground/40'
                            : isSun
                              ? 'text-red-500'
                              : 'text-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* 이벤트 칩 */}
                    <div className="mt-1 space-y-0.5 overflow-y-auto max-h-[72px]">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent?.(event)
                          }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate border cursor-pointer hover:opacity-80 ${getEventColor(event)}`}
                        >
                          {!event.all_day && (
                            <span className="opacity-70 mr-1">
                              {format(new Date(event.start_at), 'HH:mm')}
                            </span>
                          )}
                          {event.title}
                        </div>
                      ))}
                    </div>

                    {/* 날짜 hover 시 + 버튼 */}
                    {isCurrentMonth && (
                      <button
                        onClick={() => handleDateClick(date)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-md text-muted-foreground transition-opacity"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── 주간 뷰 ── */}
        {viewMode === 'week' && (
          <div className="flex flex-col h-full min-h-0">
            {/* 주간 헤더 */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/50 divide-x divide-border/50 shrink-0">
              <div className="p-3 text-center text-xs font-bold text-muted-foreground flex items-center justify-center">
                시간
              </div>
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  className={`p-3 text-center ${i === 0 ? 'text-red-500' : 'text-foreground'}`}
                >
                  <p className="text-[10px] font-bold uppercase mb-0.5">{DAY_LABELS[i]}</p>
                  <p
                    className={`text-lg font-extrabold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${
                      isSameDay(d, today) ? 'bg-foreground text-background' : ''
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* 시간 그리드 */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-8 divide-x divide-border/50">
                {/* 시간 컬럼 */}
                <div className="bg-muted/20 border-r border-border">
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="h-20 border-b border-border/50 text-xs text-muted-foreground font-medium p-2 text-center"
                    >
                      <span className="relative -top-2">{hour}:00</span>
                    </div>
                  ))}
                </div>

                {/* 요일 컬럼 */}
                {weekDays.map((d, colIndex) => {
                  const dayEvents = getEventsForDate(d)

                  return (
                    <div key={colIndex} className="relative">
                      {timeSlots.map((hour) => (
                        <div
                          key={hour}
                          className="h-20 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            const start = new Date(d)
                            start.setHours(hour, 0, 0, 0)
                            const end = new Date(d)
                            end.setHours(hour + 1, 0, 0, 0)
                            onSelectSlot?.({ start, end, action: 'click' })
                          }}
                        />
                      ))}

                      {/* 이벤트 오버레이 */}
                      {dayEvents.map((event) => {
                        if (event.all_day) return null

                        const startDate = new Date(event.start_at)
                        const hour = startDate.getHours()
                        const minute = startDate.getMinutes()

                        if (hour < 9 || hour > 22) return null

                        const topOffset = (hour - 9) * 80 + (minute / 60) * 80
                        const endDate = new Date(event.end_at)
                        const durationHours =
                          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                        const height = Math.max(durationHours * 80, 36)

                        return (
                          <div
                            key={event.id}
                            className={`absolute left-1 right-1 p-2 rounded-lg border text-xs cursor-pointer hover:brightness-95 hover:shadow-md transition-all z-10 overflow-hidden ${getEventColor(event)}`}
                            style={{ top: `${topOffset}px`, height: `${height}px` }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectEvent?.(event)
                            }}
                          >
                            <span className="font-bold truncate block">{event.title}</span>
                            <span className="opacity-80 text-[10px] flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              {format(startDate, 'HH:mm')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이벤트 유형 범례 */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
