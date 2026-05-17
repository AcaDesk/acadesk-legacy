'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, Plus, Edit3 } from 'lucide-react'
import { getAttendanceStatusInfo } from '@/lib/constants'
import dynamic from 'next/dynamic'

const AttendanceComboChart = dynamic(
  () => import('@/components/features/charts/attendance-combo-chart').then(m => m.AttendanceComboChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-muted" /> }
)
import { useStudentDetail } from '@/hooks/use-student-detail'

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

export function AttendanceTab() {
  const { attendanceRecords } = useStudentDetail()
  const [, setSelectedRecord] = useState<typeof attendanceRecords[0] | null>(null)
  const [, setEditDialogOpen] = useState(false)

  // 출석 통계 데이터 (월별)
  const attendanceStatsData = (() => {
    const monthlyStats = new Map<
      string,
      { present: number; late: number; absent: number }
    >()

    attendanceRecords.forEach((record) => {
      const date = new Date(
        record.attendance_sessions?.session_date || new Date()
      )
      const month = `${date.getMonth() + 1}월`

      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { present: 0, late: 0, absent: 0 })
      }

      const stats = monthlyStats.get(month)!
      if (record.status === 'present') stats.present++
      else if (record.status === 'late') stats.late++
      else if (record.status === 'absent') stats.absent++
    })

    return Array.from(monthlyStats.entries()).map(([period, stats]) => {
      const total = stats.present + stats.late + stats.absent
      const rate = total > 0 ? Math.round((stats.present / total) * 100) : 0
      return { period, ...stats, rate }
    })
  })()

  // 출석 통계 요약
  const totalRecords = attendanceRecords.length
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length
  const attendanceRate =
    totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 통합 출석 현황 카드 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">출석 현황</CardTitle>
              <span className="text-xs text-muted-foreground">
                총 {totalRecords}회 기준
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">출석률</p>
                <p className="text-3xl font-bold tracking-tight leading-none mt-1">
                  {attendanceRate}
                  <span className="text-base font-normal text-muted-foreground ml-0.5">
                    %
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-5 sm:gap-7">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-1))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">출석</p>
                    <p className="text-base font-semibold">
                      {presentCount}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        회
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-3))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">지각</p>
                    <p className="text-base font-semibold">
                      {lateCount}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        회
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-4))]" />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">결석</p>
                    <p className="text-base font-semibold">
                      {absentCount}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        회
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {attendanceRecords.length > 0 && attendanceStatsData.length > 0 && (
              <div className="border-t pt-3">
                <AttendanceComboChart
                  data={attendanceStatsData}
                  bare
                  height={220}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance Records List */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">출석 기록</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setSelectedRecord(null)
                setEditDialogOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              출석 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>출석 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceRecords.slice(0, 20).map((record) => {
                const statusInfo = getAttendanceStatusInfo(record.status)
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge
                        variant={statusInfo.variant}
                        className="min-w-[60px] justify-center shrink-0"
                      >
                        {statusInfo.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {record.attendance_sessions?.classes?.name || '수업'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.attendance_sessions?.session_date &&
                            formatDate(
                              new Date(record.attendance_sessions.session_date),
                              'yyyy.MM.dd (E)',
                              { locale: ko }
                            )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.check_in_at && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">
                            {formatDate(new Date(record.check_in_at), 'HH:mm', {
                              locale: ko,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">체크인</p>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setSelectedRecord(record)
                          setEditDialogOpen(true)
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {attendanceRecords.length > 20 && (
                <Button variant="outline" className="w-full" size="sm">
                  전체 출석 보기 ({attendanceRecords.length}개)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
