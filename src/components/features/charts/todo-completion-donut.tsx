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
import { Pie, PieChart, Cell } from 'recharts'

interface TodoCompletionData {
  completed: number
  incomplete: number
}

interface TodoCompletionDonutProps {
  data: TodoCompletionData
  title?: string
  description?: string
}

const chartConfig = {
  completed: {
    label: '완료',
    color: 'hsl(142 76% 36%)',
  },
  incomplete: {
    label: '미완료',
    color: 'hsl(var(--muted))',
  },
} satisfies ChartConfig

export function TodoCompletionDonut({
  data,
  title = '과제 완료율',
  description = '완료 vs 미완료 비율',
}: TodoCompletionDonutProps) {
  const total = data.completed + data.incomplete
  const completionRate = total > 0 ? Math.round((data.completed / total) * 100) : 0

  // 값이 0인 항목은 차트에서 제외하거나 최소값 적용
  const chartData = [
    data.completed > 0 && { name: '완료', value: data.completed, fill: 'hsl(142 76% 36%)' },
    data.incomplete > 0 && { name: '미완료', value: data.incomplete, fill: 'hsl(var(--muted))' },
  ].filter(Boolean) as Array<{ name: string; value: number; fill: string }>

  // 데이터가 없을 때 처리
  const displayChartData = chartData.length > 0
    ? chartData
    : [{ name: '데이터 없음', value: 1, fill: 'hsl(var(--muted))' }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent
                  hideLabel={chartData.length === 0}
                />}
              />
              <Pie
                data={displayChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={chartData.length > 1 ? 2 : 0}
                dataKey="value"
                label={false}
                startAngle={90}
                endAngle={450}
              >
                {displayChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Custom Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
              <span className="text-sm text-muted-foreground">완료 ({data.completed}개)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="text-sm text-muted-foreground">미완료 ({data.incomplete}개)</span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="mt-6 text-center">
            <p className="text-3xl font-bold">{completionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              완료율 ({data.completed} / {total})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
