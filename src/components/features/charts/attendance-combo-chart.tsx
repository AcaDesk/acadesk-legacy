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
import {
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface AttendanceData {
  period: string // 예: "1월", "2월", "1주차"
  present: number // 출석 횟수
  late: number // 지각 횟수
  absent: number // 결석 횟수
  rate: number // 출석율 (0-100)
}

interface AttendanceComboChartProps {
  data: AttendanceData[]
  title?: string
  description?: string
}

const chartConfig = {
  present: {
    label: '출석',
    color: 'hsl(var(--chart-1))',
  },
  late: {
    label: '지각',
    color: 'hsl(var(--chart-3))',
  },
  absent: {
    label: '결석',
    color: 'hsl(var(--chart-4))',
  },
  rate: {
    label: '출석율',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function AttendanceComboChart({
  data,
  title = '출석 현황',
  description = '출석/지각/결석 횟수 및 출석율',
}: AttendanceComboChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
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
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                className="text-xs"
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
              <Bar yAxisId="left" dataKey="present" fill="var(--color-present)" radius={4} />
              <Bar yAxisId="left" dataKey="late" fill="var(--color-late)" radius={4} />
              <Bar yAxisId="left" dataKey="absent" fill="var(--color-absent)" radius={4} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                stroke="var(--color-rate)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
