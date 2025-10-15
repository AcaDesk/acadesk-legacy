'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarEvent } from '@/types/calendar'
import { EVENT_TYPE_CONFIG } from '@/types/calendar'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CalendarWidgetProps {
  className?: string
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load events for the current month
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
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
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [currentDate, supabase])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_at)
      return isSameDay(eventDate, date)
    })
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Get the day of the week for the first day (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay()

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            캘린더
          </CardTitle>
          <Link href="/dashboard/calendar">
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              setCurrentDate(newDate)
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              setCurrentDate(newDate)
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div
              key={day}
              className={cn(
                'text-center text-xs font-medium py-2',
                i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-muted-foreground'
              )}
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const dayEvents = getEventsForDate(day)
            const hasEvents = dayEvents.length > 0
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square p-1 text-sm rounded-md transition-colors relative',
                  'hover:bg-accent',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  isCurrentDay && !isSelected && 'font-bold text-primary',
                  !isSameMonth(day, currentDate) && 'text-muted-foreground'
                )}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{format(day, 'd')}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event, i) => {
                        const config = EVENT_TYPE_CONFIG[event.event_type]
                        return (
                          <div
                            key={event.id}
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: event.color || config.color }}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected date events */}
        {selectedDate && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">
              {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
            </h4>
            {selectedDateEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">일정이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type]
                  return (
                    <Link
                      key={event.id}
                      href="/dashboard/calendar"
                      className="block p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: event.color || config.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {!event.all_day && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.start_at), 'HH:mm')}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0"
                          style={{
                            backgroundColor: `${event.color || config.color}20`,
                            color: event.color || config.color,
                          }}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
