'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Plus, Edit3 } from 'lucide-react'
import { getAttendanceStatusInfo } from '@/lib/constants'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import { AttendanceComboChart } from '@/components/features/charts/attendance-combo-chart'
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

export function AttendanceTab() {
  const { attendanceRecords, student } = useStudentDetail()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<unknown>(null)

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

  // 출석 히트맵 데이터
  const attendanceChartData = attendanceRecords.map((record) => ({
    date: new Date(record.attendance_sessions?.session_date || new Date()),
    status: record.status as 'present' | 'late' | 'absent' | 'none',
    note: record.notes || undefined,
  }))

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
      {/* Attendance Summary Cards */}
      <motion.div className="grid gap-4 md:grid-cols-4" variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">출석률</p>
                <p className="text-2xl font-bold">{attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">출석</p>
                <p className="text-2xl font-bold">
                  {presentCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    회
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">지각</p>
                <p className="text-2xl font-bold">
                  {lateCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    회
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">결석</p>
                <p className="text-2xl font-bold">
                  {absentCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    회
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      {attendanceRecords.length > 0 && attendanceStatsData.length > 0 && (
        <motion.div variants={itemVariants}>
        <AttendanceComboChart
          data={attendanceStatsData}
          title="월별 출석 통계"
          description="출석/지각/결석 횟수 및 출석율"
        />
        </motion.div>
      )}

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
