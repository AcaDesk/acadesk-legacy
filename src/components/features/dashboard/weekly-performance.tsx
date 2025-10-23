import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface WeeklyPerformanceProps {
  data?: {
    attendance: number[]
    todos: number[]
    reports: number[]
  }
}

export function WeeklyPerformance({ data }: WeeklyPerformanceProps) {
  // 주간 데이터 생성 (실제 데이터가 없을 경우 고정된 더미 데이터 사용)
  const weekdays = ['월', '화', '수', '목', '금', '토', '일']
  const today = new Date().getDay()
  const adjustedToday = today === 0 ? 6 : today - 1 // 일요일을 6으로 조정

  // 고정된 더미 데이터 (hydration 오류 방지)
  const defaultData = {
    attendance: [85, 88, 82, 90, 87, 75, 0],
    todos: [15, 18, 14, 20, 17, 12, 5],
    reports: [8, 10, 7, 9, 8, 6, 3]
  }

  const weeklyData = weekdays.map((day, index) => ({
    name: day,
    출석률: data?.attendance?.[index] ?? defaultData.attendance[index],
    TODO완료: data?.todos?.[index] ?? defaultData.todos[index],
    리포트생성: data?.reports?.[index] ?? defaultData.reports[index],
    isToday: index === adjustedToday
  }))

  // 이번 주 통계 계산
  const thisWeekAttendance = weeklyData.reduce((sum, day) => sum + day.출석률, 0) / 7
  const thisWeekTodos = weeklyData.reduce((sum, day) => sum + day.TODO완료, 0)
  const thisWeekReports = weeklyData.reduce((sum, day) => sum + day.리포트생성, 0)

  // 지난 주 대비 변화율 (더미 데이터)
  const attendanceChange: number = 5.2
  const todosChange: number = -2.1
  const reportsChange: number = 12.5

  interface TooltipPayloadEntry {
    color?: string
    name?: string
    value?: number | string
  }

  interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="text-sm font-medium">{label}요일</div>
          <div className="space-y-1 mt-1">
            {payload.map((entry, index: number) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>주간 성과 분석</CardTitle>
        <CardDescription>이번 주 학원 운영 성과 추이</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 차트 영역 */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTodos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="출석률"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAttendance)"
              />
              <Area
                type="monotone"
                dataKey="TODO완료"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTodos)"
              />
              <Area
                type="monotone"
                dataKey="리포트생성"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReports)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 주간 요약 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">평균 출석률</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{thisWeekAttendance.toFixed(1)}%</span>
              {attendanceChange !== 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    attendanceChange > 0
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  {attendanceChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(attendanceChange)}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">TODO 완료</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{thisWeekTodos}개</span>
              {todosChange !== 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    todosChange > 0
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  {todosChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(todosChange)}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">리포트 생성</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{thisWeekReports}개</span>
              {reportsChange !== 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    reportsChange > 0
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  {reportsChange > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(reportsChange)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">출석률</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">TODO 완료</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">리포트 생성</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}