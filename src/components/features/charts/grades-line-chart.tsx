'use client'

import * as React from 'react'
import {
  Card,
  CardAction,
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
import { Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface GradeDataPoint {
  examName: string
  score: number
  classAverage?: number
  date?: string
}

interface GradesLineChartProps {
  data: GradeDataPoint[]
  title?: string
  description?: string
  showClassAverage?: boolean
}

const chartConfig = {
  score: {
    label: '내 점수',
    color: 'var(--primary)',
  },
  classAverage: {
    label: '반 평균',
    color: 'hsl(var(--muted-foreground))',
  },
} satisfies ChartConfig

export function GradesLineChart({
  data,
  title = '성적 추이',
  description = '시험별 점수 변화',
  showClassAverage = true,
}: GradesLineChartProps) {
  const [timeRange, setTimeRange] = React.useState('all')

  const filteredData = React.useMemo(() => {
    if (timeRange === 'all') return data
    const limit = timeRange === '5' ? 5 : timeRange === '10' ? 10 : data.length
    return data.slice(-limit)
  }, [data, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {data.length > 5 && (
          <CardAction>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) => value && setTimeRange(value)}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:!px-4 @[540px]/card:flex"
            >
              <ToggleGroupItem value="all">전체</ToggleGroupItem>
              <ToggleGroupItem value="10">최근 10개</ToggleGroupItem>
              <ToggleGroupItem value="5">최근 5개</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[540px]/card:hidden"
                aria-label="범위 선택"
              >
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg">
                  전체
                </SelectItem>
                <SelectItem value="10" className="rounded-lg">
                  최근 10개
                </SelectItem>
                <SelectItem value="5" className="rounded-lg">
                  최근 5개
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart
            data={filteredData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="examName"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 100]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              type="natural"
              dataKey="score"
              stroke="var(--color-score)"
              fill="url(#fillScore)"
              strokeWidth={2}
            />
            {showClassAverage && (
              <Line
                type="natural"
                dataKey="classAverage"
                stroke="var(--color-classAverage)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
