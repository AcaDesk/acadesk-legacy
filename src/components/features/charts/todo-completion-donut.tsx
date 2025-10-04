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
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from 'recharts'

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
    color: 'hsl(var(--chart-1))',
  },
  incomplete: {
    label: '미완료',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function TodoCompletionDonut({
  data,
  title = '과제 완료율',
  description = '완료 vs 미완료 비율',
}: TodoCompletionDonutProps) {
  const chartData = [
    { name: '완료', value: data.completed, fill: 'var(--color-completed)' },
    { name: '미완료', value: data.incomplete, fill: 'var(--color-incomplete)' },
  ]

  const total = data.completed + data.incomplete
  const completionRate = total > 0 ? ((data.completed / total) * 100).toFixed(1) : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold">{completionRate}%</p>
          <p className="text-sm text-muted-foreground">완료율</p>
        </div>
      </CardContent>
    </Card>
  )
}
