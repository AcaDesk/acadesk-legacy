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

interface SubjectScoreData {
  subject: string
  score: number
  classAverage?: number
  highest?: number
  lowest?: number
}

interface GradesBarChartProps {
  data: SubjectScoreData[]
  title?: string
  description?: string
  showComparison?: boolean
}

const chartConfig = {
  score: {
    label: '내 점수',
    color: 'hsl(var(--chart-1))',
  },
  classAverage: {
    label: '반 평균',
    color: 'hsl(var(--chart-2))',
  },
  highest: {
    label: '최고점',
    color: 'hsl(var(--chart-3))',
  },
  lowest: {
    label: '최저점',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig

export function GradesBarChart({
  data,
  title = '과목별 성적',
  description = '과목별 점수 비교',
  showComparison = true,
}: GradesBarChartProps) {
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
                dataKey="subject"
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
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="score" fill="var(--color-score)" radius={4} />
              {showComparison && (
                <Bar dataKey="classAverage" fill="var(--color-classAverage)" radius={4} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
