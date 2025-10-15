"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, CalendarDays, Clock, Users, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { CalendarEvent } from "@/hooks/use-dashboard-data"

interface CalendarWidgetProps {
  events?: CalendarEvent[]
}

export function CalendarWidget({ events = [] }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ]

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]

  // Get the first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  // Get the starting day of the week (0 = Sunday)
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Calculate the number of days to show from previous month
  const daysFromPrevMonth = startingDayOfWeek

  // Calculate total cells needed (always show 6 weeks = 42 days)
  const totalCells = 42

  // Generate calendar days
  const calendarDays = []

  // Add days from previous month
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()

  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    calendarDays.push({
      date: lastDayOfPrevMonth - i,
      month: 'prev',
      fullDate: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDayOfPrevMonth - i)
    })
  }

  // Add days from current month
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    calendarDays.push({
      date: i,
      month: 'current',
      fullDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
    })
  }

  // Add days from next month
  const remainingCells = totalCells - calendarDays.length
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      date: i,
      month: 'next',
      fullDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
    })
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
    })
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-500'
      case 'consultation': return 'bg-green-500'
      case 'exam': return 'bg-red-500'
      case 'other': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <GraduationCap className="h-3 w-3" />
      case 'consultation': return <Users className="h-3 w-3" />
      case 'exam': return <Clock className="h-3 w-3" />
      default: return <CalendarDays className="h-3 w-3" />
    }
  }

  // Get today's events
  const todayEvents = getEventsForDate(new Date())

  // Get selected date's events
  const selectedDateEvents = getEventsForDate(selectedDate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            캘린더
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            오늘
          </Button>
        </CardTitle>
        <CardDescription>수업 일정과 중요한 이벤트를 확인하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h3 className="text-lg font-semibold">
            {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
          </h3>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "text-center text-xs font-medium py-1",
                  index === 0 && "text-red-500",
                  index === 6 && "text-blue-500"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day.fullDate)
              const hasEvents = dayEvents.length > 0

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day.fullDate)}
                  className={cn(
                    "relative h-10 text-sm rounded-md transition-all hover:bg-muted",
                    day.month !== 'current' && "text-muted-foreground",
                    isToday(day.fullDate) && "bg-primary/10 font-bold text-primary",
                    isSelected(day.fullDate) && "ring-2 ring-primary",
                    index % 7 === 0 && day.month === 'current' && "text-red-500",
                    index % 7 === 6 && day.month === 'current' && "text-blue-500"
                  )}
                >
                  <span>{day.date}</span>
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 w-1 rounded-full",
                            getEventTypeColor(event.event_type)
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              오늘의 일정
            </h4>
            <div className="space-y-1.5">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    "h-6 w-6 rounded flex items-center justify-center text-white",
                    getEventTypeColor(event.event_type)
                  )}>
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(event.start_date).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Date's Events (if different from today) */}
        {!isToday(selectedDate) && selectedDateEvents.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
            </h4>
            <div className="space-y-1.5">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    "h-6 w-6 rounded flex items-center justify-center text-white",
                    getEventTypeColor(event.event_type)
                  )}>
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(event.start_date).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Link */}
        <Link href="/calendar" className="block">
          <Button variant="outline" className="w-full" size="sm">
            전체 일정 보기
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}