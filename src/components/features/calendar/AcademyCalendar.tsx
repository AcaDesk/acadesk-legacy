'use client'

import { useMemo, useCallback, useState } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CalendarEvent, BigCalendarEvent, EventType } from '@/core/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'
import './calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const locales = {
  ko: ko,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // 일요일 시작
  getDay,
  locales,
})

// Create DnD Calendar - use any to bypass complex type constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop<any>(Calendar)

// 한글 메시지
const messages = {
  allDay: '종일',
  previous: '이전',
  next: '다음',
  today: '오늘',
  month: '월',
  week: '주',
  day: '일',
  agenda: '일정',
  date: '날짜',
  time: '시간',
  event: '이벤트',
  noEventsInRange: '해당 기간에 일정이 없습니다.',
  showMore: (total: number) => `+${total} 더보기`,
}

interface AcademyCalendarProps {
  events: CalendarEvent[]
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date; action: string }) => void
  onNavigate?: (date: Date) => void
  onView?: (view: View) => void
  onEventDrop?: (data: { event: CalendarEvent; start: Date; end: Date }) => void
  onEventResize?: (data: { event: CalendarEvent; start: Date; end: Date }) => void
  defaultView?: View
  defaultDate?: Date
  selectable?: boolean
  resizable?: boolean
  draggable?: boolean
  className?: string
}

export function AcademyCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  onView,
  onEventDrop,
  onEventResize,
  defaultView = Views.MONTH,
  defaultDate = new Date(),
  selectable = true,
  resizable = true,
  draggable = true,
  className = '',
}: AcademyCalendarProps) {
  const [currentView, setCurrentView] = useState<View>(defaultView)

  // Convert CalendarEvent to BigCalendarEvent
  const calendarEvents = useMemo<BigCalendarEvent[]>(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      allDay: event.all_day,
      resource: event,
    }))
  }, [events])

  // Event style getter - applies custom colors based on event type
  const eventStyleGetter = useCallback((event: BigCalendarEvent) => {
    const calendarEvent = event.resource as CalendarEvent
    const eventType = calendarEvent.event_type as EventType
    const config = EVENT_TYPE_CONFIG[eventType]

    // Use custom color if provided, otherwise use default color for event type
    const backgroundColor = calendarEvent.color || config?.color || '#64748b'

    return {
      className: `rbc-event-${eventType}`,
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: 'white',
      },
    }
  }, [])

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: BigCalendarEvent) => {
      if (onSelectEvent && event.resource) {
        onSelectEvent(event.resource)
      }
    },
    [onSelectEvent]
  )

  // Handle slot selection (for creating new events)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (onSelectSlot) {
        onSelectSlot(slotInfo)
      }
    },
    [onSelectSlot]
  )

  // Handle view change
  const handleViewChange = useCallback(
    (view: View) => {
      setCurrentView(view)
      if (onView) {
        onView(view)
      }
    },
    [onView]
  )

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (onEventDrop && data.event.resource) {
        onEventDrop({
          event: data.event.resource,
          start: data.start instanceof Date ? data.start : new Date(data.start),
          end: data.end instanceof Date ? data.end : new Date(data.end),
        })
      }
    },
    [onEventDrop]
  )

  // Handle event resize
  const handleEventResize = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (onEventResize && data.event.resource) {
        onEventResize({
          event: data.event.resource,
          start: data.start instanceof Date ? data.start : new Date(data.start),
          end: data.end instanceof Date ? data.end : new Date(data.end),
        })
      }
    },
    [onEventResize]
  )

  return (
    <div className={`h-full ${className}`}>
      <DnDCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        view={currentView}
        onView={handleViewChange}
        defaultDate={defaultDate}
        onNavigate={onNavigate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        selectable={selectable}
        resizable={resizable}
        draggableAccessor={() => draggable}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture="ko"
        popup
        showMultiDayTimes
        step={30}
        timeslots={2}
        style={{ height: '100%' }}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
      />
    </div>
  )
}
