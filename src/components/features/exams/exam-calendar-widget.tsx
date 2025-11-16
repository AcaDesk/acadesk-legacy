'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Exam {
  id: string
  name: string
  exam_date: string | null
}

interface ExamCalendarWidgetProps {
  exams: Exam[]
}

export function ExamCalendarWidget({ exams }: ExamCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Get first and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get days to show from previous month
    const startDay = firstDay.getDay()
    const prevMonthDays = startDay === 0 ? 0 : startDay

    // Get days to show from next month
    const endDay = lastDay.getDay()
    const nextMonthDays = endDay === 6 ? 0 : 6 - endDay

    // Build calendar array
    const days: {
      date: Date
      isCurrentMonth: boolean
      exams: Exam[]
    }[] = []

    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({
        date,
        isCurrentMonth: false,
        exams: [],
      })
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const dayExams = exams.filter((exam) => {
        if (!exam.exam_date) return false
        const examDate = new Date(exam.exam_date)
        return (
          examDate.getFullYear() === year &&
          examDate.getMonth() === month &&
          examDate.getDate() === i
        )
      })

      days.push({
        date,
        isCurrentMonth: true,
        exams: dayExams,
      })
    }

    // Next month days
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        exams: [],
      })
    }

    return days
  }, [currentDate, exams])

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  function isToday(date: Date) {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  const monthYearText = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>시험 캘린더</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h4 className="text-base font-semibold min-w-[120px] text-center">
              {monthYearText}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
          {/* Weekday headers */}
          <div className="font-medium text-muted-foreground">일</div>
          <div className="font-medium text-muted-foreground">월</div>
          <div className="font-medium text-muted-foreground">화</div>
          <div className="font-medium text-muted-foreground">수</div>
          <div className="font-medium text-muted-foreground">목</div>
          <div className="font-medium text-muted-foreground">금</div>
          <div className="font-medium text-muted-foreground">토</div>

          {/* Calendar days */}
          {calendarData.map((day, index) => {
            const hasExam = day.exams.length > 0
            const today = isToday(day.date)

            return (
              <div key={index} className="relative">
                <span
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors',
                    !day.isCurrentMonth && 'text-muted-foreground/50',
                    day.isCurrentMonth && 'hover:bg-accent',
                    today && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {day.date.getDate()}
                </span>
                {hasExam && (
                  <div
                    className={cn(
                      'absolute bottom-0 left-1/2 -translate-x-1/2 size-1 rounded-full',
                      today ? 'bg-primary-foreground' : 'bg-primary'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
