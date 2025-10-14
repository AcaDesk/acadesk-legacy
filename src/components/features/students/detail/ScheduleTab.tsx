'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format as formatDate, addDays, startOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useStudentDetail } from '@/contexts/studentDetailContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

interface WeeklySchedule {
  day_of_week: number
  sessions: {
    id: string
    class_id: string
    class_name: string
    scheduled_start_at: string
    scheduled_end_at: string
    instructor_name: string | null
  }[]
}

export function ScheduleTab() {
  const { student } = useStudentDetail()
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const weekDays = ['월', '화', '수', '목', '금', '토', '일']

  useEffect(() => {
    loadWeeklySchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function loadWeeklySchedule() {
    try {
      setLoading(true)

      // Get student's enrolled classes
      const enrolledClassIds =
        student.class_enrollments
          ?.filter((ce: unknown) => ce.status === 'active')
          .map((ce: unknown) => ce.class_id) || []

      if (enrolledClassIds.length === 0) {
        setWeeklySchedule([])
        setLoading(false)
        return
      }

      // Get attendance sessions for this week for enrolled classes
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
      const weekEnd = addDays(weekStart, 6)

      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(
          `
          id,
          session_date,
          scheduled_start_at,
          scheduled_end_at,
          class_id,
          classes (
            name,
            instructor_id,
            users (
              name
            )
          )
        `
        )
        .in('class_id', enrolledClassIds)
        .gte('session_date', formatDate(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', formatDate(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_start_at')

      if (error) throw error

      // Group by day of week
      const scheduleByDay: Record<number, unknown[]> = {}
      ;(data || []).forEach((session: unknown) => {
        const dayOfWeek = new Date(session.session_date).getDay()
        // Convert Sunday (0) to 7 for easier sorting
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek

        if (!scheduleByDay[adjustedDay]) {
          scheduleByDay[adjustedDay] = []
        }

        scheduleByDay[adjustedDay].push({
          id: session.id,
          class_id: session.class_id,
          class_name: session.classes?.name || '수업',
          scheduled_start_at: session.scheduled_start_at,
          scheduled_end_at: session.scheduled_end_at,
          instructor_name: session.classes?.users?.name || null,
        })
      })

      // Convert to array format
      const schedule: WeeklySchedule[] = []
      for (let day = 1; day <= 7; day++) {
        schedule.push({
          day_of_week: day,
          sessions: scheduleByDay[day] || [],
        })
      }

      setWeeklySchedule(schedule)
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const hasAnySessions = weeklySchedule.some((day) => day.sessions.length > 0)

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {!hasAnySessions ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>이번 주 예정된 수업이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        weeklySchedule.map((daySchedule, idx) => {
          const dayIndex = daySchedule.day_of_week === 7 ? 0 : daySchedule.day_of_week
          const dayName = weekDays[dayIndex - 1] || weekDays[6]
          const today = new Date()
          const weekStart = startOfWeek(today, { weekStartsOn: 1 })
          const currentDate = addDays(weekStart, idx)
          const isToday = formatDate(currentDate, 'yyyy-MM-dd') === formatDate(today, 'yyyy-MM-dd')

          return (
            <motion.div key={daySchedule.day_of_week} variants={itemVariants}>
            <Card className={isToday ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {dayName}요일
                    {isToday && (
                      <Badge variant="default" className="text-xs">
                        오늘
                      </Badge>
                    )}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(currentDate, 'M월 d일', { locale: ko })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {daySchedule.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">수업 없음</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedule.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{session.class_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(new Date(session.scheduled_start_at), 'HH:mm', {
                                locale: ko,
                              })}{' '}
                              -{' '}
                              {formatDate(new Date(session.scheduled_end_at), 'HH:mm', {
                                locale: ko,
                              })}
                            </span>
                            {session.instructor_name && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {session.instructor_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          )
        })
      )}
    </motion.div>
  )
}
