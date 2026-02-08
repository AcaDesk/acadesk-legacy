'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/card'
import { cn } from '@/lib/utils'

type AttendanceStatus = 'present' | 'late' | 'absent' | 'none'

interface AttendanceDay {
  date: Date | string
  status: AttendanceStatus
  note?: string
}

interface AttendanceHeatmapProps {
  data: AttendanceDay[]
  title?: string
  description?: string
  year?: number
  month?: number // 1-12
  compact?: boolean
}

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-500 hover:bg-green-600',
  late: 'bg-yellow-500 hover:bg-yellow-600',
  absent: 'bg-red-500 hover:bg-red-600',
  none: 'bg-muted hover:bg-muted/80',
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: '출석',
  late: '지각',
  absent: '결석',
  none: '해당없음',
}

export function AttendanceHeatmap({
  data,
  title = '출석 캘린더',
  description = '월별 출석 현황',
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  compact = false,
}: AttendanceHeatmapProps) {
  // 해당 월의 첫날과 마지막날 계산
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0 (일) ~ 6 (토)

  // date 필드를 Date 객체로 정규화 (서버에서 JSON 직렬화 시 문자열로 내려올 수 있음)
  const normalizedData = data.map((item) => ({
    ...item,
    date: item.date instanceof Date ? item.date : new Date(item.date),
  }))

  // 데이터를 맵으로 변환 (빠른 조회)
  const dataMap = new Map<string, typeof normalizedData[number]>()
  normalizedData.forEach((item) => {
    const key = item.date.toISOString().split('T')[0]
    dataMap.set(key, item)
  })

  // 달력 그리드 생성
  type NormalizedDay = { date: Date; status: AttendanceStatus; note?: string }
  const calendarDays: (NormalizedDay | null)[] = []

  // 첫 주의 빈 칸 추가
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // 날짜 추가
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const key = date.toISOString().split('T')[0]
    const dayData = dataMap.get(key)

    calendarDays.push(
      dayData || {
        date,
        status: 'none',
      }
    )
  }

  // 통계 계산
  const stats = {
    present: normalizedData.filter((d) => d.status === 'present').length,
    late: normalizedData.filter((d) => d.status === 'late').length,
    absent: normalizedData.filter((d) => d.status === 'absent').length,
  }

  const totalDays = stats.present + stats.late + stats.absent
  const attendanceRate =
    totalDays > 0 ? (((stats.present + stats.late * 0.5) / totalDays) * 100).toFixed(1) : '0'

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2 px-4 pt-4' : 'pb-3 sm:pb-6'}>
        <div className={compact ? 'flex items-center justify-between' : ''}>
          <div>
            <CardTitle className={compact ? 'text-sm' : 'text-base sm:text-lg'}>{title}</CardTitle>
            <CardDescription className="text-xs">
              {description} - {year}년 {month}월
            </CardDescription>
          </div>
          {compact && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-green-600">{stats.present}출석</span>
              <span className="font-semibold text-yellow-600">{stats.late}지각</span>
              <span className="font-semibold text-red-600">{stats.absent}결석</span>
              <span className="font-semibold">{attendanceRate}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={compact ? 'px-4 pb-4 pt-0' : ''}>
        {/* 요일 헤더 */}
        <div className={cn('grid grid-cols-7', compact ? 'gap-0.5 mb-0.5' : 'gap-2 mb-2')}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className={cn('text-center font-medium text-muted-foreground', compact ? 'text-[10px] leading-4' : 'text-xs')}>
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className={cn('grid grid-cols-7', compact ? 'gap-0.5' : 'gap-2')}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className={compact ? 'h-6' : 'aspect-square'} />
            }

            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  'group relative flex items-center justify-center font-medium transition-colors cursor-pointer',
                  compact ? 'h-6 rounded-sm text-[10px]' : 'aspect-square rounded-md text-xs',
                  statusColors[day.status]
                )}
                title={`${day.date.getDate()}일 - ${statusLabels[day.status]}${day.note ? `: ${day.note}` : ''}`}
              >
                <span
                  className={cn(
                    'text-white',
                    day.status === 'none' && 'text-muted-foreground'
                  )}
                >
                  {day.date.getDate()}
                </span>
                {day.note && (
                  <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-full rounded bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block z-10 whitespace-nowrap">
                    {day.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 범례 (compact에서는 헤더에 통계를 표시하므로 범례만 간략히) */}
        {compact ? (
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-green-500" />
              <span>출석</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-yellow-500" />
              <span>지각</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-red-500" />
              <span>결석</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span>출석</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-3 w-3 rounded bg-yellow-500" />
                <span>지각</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-3 w-3 rounded bg-red-500" />
                <span>결석</span>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">출석</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500">{stats.late}</p>
                  <p className="text-xs text-muted-foreground">지각</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-red-500">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">결석</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">출석율</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
