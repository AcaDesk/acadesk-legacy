'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

export interface StudentCompletionData {
  studentId: string
  studentName: string
  studentCode: string
  totalTodos: number
  completedTodos: number
  verifiedTodos: number
  completionRate: number
}

interface StudentCompletionBarChartProps {
  data: StudentCompletionData[]
  title?: string
  description?: string
  maxStudents?: number
}

const chartConfig = {
  completionRate: {
    label: '완료율',
    color: 'hsl(142 76% 36%)',
  },
} satisfies ChartConfig

export function StudentCompletionBarChart({
  data,
  title = '학생별 완료율',
  description = '과제 완료율 상위 학생',
  maxStudents = 10,
}: StudentCompletionBarChartProps) {
  // Sort by completion rate and take top N students
  const sortedData = [...data]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, maxStudents)

  // Format data for chart
  const chartData = sortedData.map(student => ({
    name: student.studentName,
    code: student.studentCode,
    completionRate: Math.round(student.completionRate),
    totalTodos: student.totalTodos,
    completedTodos: student.completedTodos,
    verifiedTodos: student.verifiedTodos,
  }))

  // Color based on completion rate
  const getBarColor = (rate: number) => {
    if (rate >= 80) return 'hsl(142 76% 36%)' // Green
    if (rate >= 60) return 'hsl(45 93% 47%)' // Yellow
    if (rate >= 40) return 'hsl(25 95% 53%)' // Orange
    return 'hsl(0 72% 51%)' // Red
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>통계 데이터가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '완료율 (%)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null

                  const data = payload[0].payload

                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <div className="font-semibold mb-2">{data.name}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">학번:</span>
                          <span className="font-medium">{data.code}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">완료율:</span>
                          <span className="font-bold text-green-600">{data.completionRate}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">총 과제:</span>
                          <span>{data.totalTodos}개</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">완료:</span>
                          <span>{data.completedTodos}개</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">검증:</span>
                          <span>{data.verifiedTodos}개</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="completionRate" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
            <span className="text-xs text-muted-foreground">우수 (80% 이상)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(45 93% 47%)' }} />
            <span className="text-xs text-muted-foreground">양호 (60-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(25 95% 53%)' }} />
            <span className="text-xs text-muted-foreground">보통 (40-59%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(0 72% 51%)' }} />
            <span className="text-xs text-muted-foreground">주의 (40% 미만)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
