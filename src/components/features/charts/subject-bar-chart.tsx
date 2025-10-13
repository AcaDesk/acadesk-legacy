'use client'

import * as React from 'react'
import { TrendingUp, TrendingDown, Award } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface SubjectScore {
  subject: string
  score: number
  classAverage?: number
  previousScore?: number
}

interface SubjectBarChartProps {
  data: SubjectScore[]
  title?: string
  description?: string
}

const chartConfig = {
  score: {
    label: '내 점수',
    color: 'hsl(var(--primary))',
  },
  classAverage: {
    label: '반 평균',
    color: 'hsl(var(--muted-foreground))',
  },
  previousScore: {
    label: '지난 시험',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function SubjectBarChart({
  data,
  title = '과목별 성적 분포',
  description = '과목별 점수 및 비교',
}: SubjectBarChartProps) {
  const [comparison, setComparison] = React.useState<'none' | 'class' | 'previous'>('class')

  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      subject: item.subject,
      score: item.score,
      ...(comparison === 'class' && item.classAverage !== undefined
        ? { classAverage: item.classAverage }
        : {}),
      ...(comparison === 'previous' && item.previousScore !== undefined
        ? { previousScore: item.previousScore }
        : {}),
    }))
  }, [data, comparison])

  // Calculate stats
  const stats = React.useMemo(() => {
    const scores = data.map((d) => d.score)
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const max = Math.max(...scores)
    const min = Math.min(...scores)
    const maxSubject = data.find((d) => d.score === max)?.subject
    const minSubject = data.find((d) => d.score === min)?.subject

    // Average change from previous
    let avgChange = null
    if (comparison === 'previous') {
      const validScores = data.filter((item) => item.previousScore !== undefined)
      if (validScores.length > 0) {
        const totalChange = validScores.reduce(
          (sum, item) => sum + (item.score - (item.previousScore || 0)),
          0
        )
        avgChange = totalChange / validScores.length
      }
    }

    // Comparison with class average
    let classComparison = null
    if (comparison === 'class') {
      const validScores = data.filter((item) => item.classAverage !== undefined)
      if (validScores.length > 0) {
        const totalDiff = validScores.reduce(
          (sum, item) => sum + (item.score - (item.classAverage || 0)),
          0
        )
        classComparison = totalDiff / validScores.length
      }
    }

    return { avg, max, min, maxSubject, minSubject, avgChange, classComparison }
  }, [data, comparison])

  const hasClassAverage = data.some((item) => item.classAverage !== undefined)
  const hasPreviousScore = data.some((item) => item.previousScore !== undefined)

  return (
    <Card className="@container/card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {(hasClassAverage || hasPreviousScore) && (
            <CardAction>
              <ToggleGroup
                type="single"
                value={comparison}
                onValueChange={(value) => value && setComparison(value as typeof comparison)}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="none">기본</ToggleGroupItem>
                {hasClassAverage && (
                  <ToggleGroupItem value="class">반 평균</ToggleGroupItem>
                )}
                {hasPreviousScore && (
                  <ToggleGroupItem value="previous">이전 대비</ToggleGroupItem>
                )}
              </ToggleGroup>
            </CardAction>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="subject"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px' }}
              />

              {/* 내 점수 */}
              <Bar
                dataKey="score"
                fill="var(--color-score)"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />

              {/* 반 평균 */}
              {comparison === 'class' && (
                <Bar
                  dataKey="classAverage"
                  fill="var(--color-classAverage)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              )}

              {/* 이전 점수 */}
              {comparison === 'previous' && (
                <Bar
                  dataKey="previousScore"
                  fill="var(--color-previousScore)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-3 text-sm pt-4 border-t">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 w-full">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">평균 점수</p>
            <p className="text-lg font-bold">{stats.avg.toFixed(1)}점</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">최고 점수</p>
            <p className="text-lg font-bold text-foreground">{stats.max}점</p>
            {stats.maxSubject && (
              <p className="text-xs text-muted-foreground truncate">{stats.maxSubject}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">최저 점수</p>
            <p className="text-lg font-bold">{stats.min}점</p>
            {stats.minSubject && (
              <p className="text-xs text-muted-foreground truncate">{stats.minSubject}</p>
            )}
          </div>
        </div>

        {/* Comparison Insight */}
        {comparison === 'previous' && stats.avgChange !== null && (
          <div className="flex items-center gap-2 leading-none font-medium w-full">
            {stats.avgChange > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-foreground" />
                <span>이전 대비 평균 {stats.avgChange.toFixed(1)}점 상승</span>
              </>
            ) : stats.avgChange < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span>이전 대비 평균 {Math.abs(stats.avgChange).toFixed(1)}점 하락</span>
              </>
            ) : (
              <>
                <Award className="h-4 w-4" />
                <span>평균 점수 유지</span>
              </>
            )}
          </div>
        )}
        {comparison === 'class' && stats.classComparison !== null && (
          <div className="flex items-center gap-2 leading-none font-medium w-full">
            {stats.classComparison > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-foreground" />
                <span>반 평균보다 평균 {stats.classComparison.toFixed(1)}점 높음</span>
              </>
            ) : stats.classComparison < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span>반 평균보다 평균 {Math.abs(stats.classComparison).toFixed(1)}점 낮음</span>
              </>
            ) : (
              <>
                <Award className="h-4 w-4" />
                <span>반 평균과 동일</span>
              </>
            )}
          </div>
        )}
        {comparison === 'none' && (
          <div className="text-muted-foreground flex items-center gap-2 leading-none w-full">
            전체 과목 점수 분포
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
