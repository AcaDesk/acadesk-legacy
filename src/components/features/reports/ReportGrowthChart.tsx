'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ReportData } from '@/core/types/report-entity'

interface ReportGrowthChartProps {
  chartPoints: NonNullable<ReportData['chartPoints']>
}

export function ReportGrowthChart({ chartPoints }: ReportGrowthChartProps) {
  // 데이터를 차트에 맞게 변환
  const chartData = chartPoints.map((point) => ({
    month: point.month.split('-')[1] + '월',
    성적: Math.round(point.avgScore),
    출석률: Math.round(point.attendanceRate),
    과제완료율: Math.round(point.homeworkRate),
    ...(point.achievementRate !== undefined && {
      목표달성률: Math.round(point.achievementRate),
    }),
  }))

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="성적"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-1))' }}
          />
          <Line
            type="monotone"
            dataKey="출석률"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))' }}
          />
          <Line
            type="monotone"
            dataKey="과제완료율"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-3))' }}
          />
          {chartData[0]?.목표달성률 !== undefined && (
            <Line
              type="monotone"
              dataKey="목표달성률"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-4))' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
