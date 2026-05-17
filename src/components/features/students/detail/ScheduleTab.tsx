'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Skeleton } from '@ui/skeleton'
import { Calendar, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format as formatDate, addDays, startOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useStudentDetail } from '@/hooks/use-student-detail'
import { cn } from '@/lib/utils'

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

interface SessionInfo {
  id: string
  class_id: string
  class_name: string
  scheduled_start_at: string
  scheduled_end_at: string
  instructor_name: string | null
}

interface WeeklySchedule {
  day_of_week: number
  sessions: SessionInfo[]
}

interface ClassEnrollment {
  status: string
  class_id: string
}

interface AttendanceSessionData {
  id: string
  session_date: string
  scheduled_start_at: string
  scheduled_end_at: string
  class_id: string
  classes?: {
    name?: string
    users?: {
      name?: string
    }[] | null
  }[] | null
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
          ?.filter((ce) => (ce as unknown as ClassEnrollment).status === 'active')
          .map((ce) => (ce as unknown as ClassEnrollment).class_id) || []

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
      const scheduleByDay: Record<number, SessionInfo[]> = {}
      ;(data || []).forEach((sessionData) => {
        const session = sessionData as AttendanceSessionData
        const dayOfWeek = new Date(session.session_date).getDay()
        // Convert Sunday (0) to 7 for easier sorting
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek

        if (!scheduleByDay[adjustedDay]) {
          scheduleByDay[adjustedDay] = []
        }

        scheduleByDay[adjustedDay].push({
          id: session.id,
          class_id: session.class_id,
          class_name: session.classes?.[0]?.name || '수업',
          scheduled_start_at: session.scheduled_start_at,
          scheduled_end_at: session.scheduled_end_at,
          instructor_name: session.classes?.[0]?.users?.[0]?.name || null,
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
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnySessions = weeklySchedule.some((day) => day.sessions.length > 0)
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const totalSessions = weeklySchedule.reduce(
    (sum, d) => sum + d.sessions.length,
    0
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">이번 주 시간표</CardTitle>
              <span className="text-xs text-muted-foreground">
                {formatDate(weekStart, 'M.d', { locale: ko })} ~{' '}
                {formatDate(weekEnd, 'M.d', { locale: ko })}
                {hasAnySessions && (
                  <span className="ml-2">· 총 {totalSessions}개 수업</span>
                )}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {!hasAnySessions ? (
              <div className="py-10 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">이번 주 예정된 수업이 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {weeklySchedule.map((daySchedule, idx) => {
                  const dayIndex =
                    daySchedule.day_of_week === 7 ? 0 : daySchedule.day_of_week
                  const dayName = weekDays[dayIndex - 1] || weekDays[6]
                  const currentDate = addDays(weekStart, idx)
                  const isToday =
                    formatDate(currentDate, 'yyyy-MM-dd') ===
                    formatDate(today, 'yyyy-MM-dd')
                  const isWeekend =
                    daySchedule.day_of_week === 6 ||
                    daySchedule.day_of_week === 7
                  const hasNoSessions = daySchedule.sessions.length === 0

                  return (
                    <div
                      key={daySchedule.day_of_week}
                      className={cn(
                        'flex flex-col rounded-lg border p-2',
                        isToday
                          ? 'border-primary bg-primary/5'
                          : hasNoSessions
                            ? 'border-dashed bg-muted/20'
                            : 'bg-background'
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-1 pb-2 border-b mb-2">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              isWeekend && !isToday && 'text-muted-foreground'
                            )}
                          >
                            {dayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(currentDate, 'M/d')}
                          </span>
                        </div>
                        {isToday && (
                          <Badge
                            variant="default"
                            className="text-[10px] h-4 px-1.5"
                          >
                            오늘
                          </Badge>
                        )}
                      </div>
                      {hasNoSessions ? (
                        <p className="text-[11px] text-muted-foreground/70 text-center py-3">
                          —
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {daySchedule.sessions.map((session) => (
                            <div
                              key={session.id}
                              className="rounded-md border bg-card px-2 py-1.5 text-xs leading-tight"
                            >
                              <p className="font-mono font-semibold text-foreground">
                                {formatDate(
                                  new Date(session.scheduled_start_at),
                                  'HH:mm'
                                )}
                              </p>
                              <p
                                className="font-medium truncate mt-0.5"
                                title={session.class_name}
                              >
                                {session.class_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                ~
                                {formatDate(
                                  new Date(session.scheduled_end_at),
                                  'HH:mm'
                                )}
                              </p>
                              {session.instructor_name && (
                                <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 truncate">
                                  <User className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">
                                    {session.instructor_name}
                                  </span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
