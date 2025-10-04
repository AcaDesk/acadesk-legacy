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
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface TodoCompletionTrendData {
  period: string // 예: "1주차", "2주차", "1월", "2월"
  completionRate: number // 0-100
  classAverage?: number
}

interface TodoCompletionBarProps {
  data: TodoCompletionTrendData[]
  title?: string
  description?: string
  showClassAverage?: boolean
}

const chartConfig = {
  completionRate: {
    label: '완료율',
    color: 'hsl(var(--chart-1))',
  },
  classAverage: {
    label: '반 평균',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function TodoCompletionBar({
  data,
  title = '과제 완료율 추이',
  description = '주별/월별 과제 완료율',
  showClassAverage = true,
}: TodoCompletionBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                className="text-xs"
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={4} />
              {showClassAverage && (
                <Bar dataKey="classAverage" fill="var(--color-classAverage)" radius={4} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
