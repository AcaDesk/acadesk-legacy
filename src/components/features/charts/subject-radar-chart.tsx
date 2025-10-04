'use client'

import * as React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts'

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

interface SubjectRadarChartProps {
  data: SubjectScore[]
  title?: string
  description?: string
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
  previousScore: {
    label: '지난 시험',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function SubjectRadarChart({
  data,
  title = '과목별 성취도',
  description = '과목별 점수 분포',
}: SubjectRadarChartProps) {
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

  // Calculate average improvement
  const averageChange = React.useMemo(() => {
    if (comparison !== 'previous') return null

    const validScores = data.filter(
      (item) => item.previousScore !== undefined
    )
    if (validScores.length === 0) return null

    const totalChange = validScores.reduce(
      (sum, item) => sum + (item.score - (item.previousScore || 0)),
      0
    )
    return totalChange / validScores.length
  }, [data, comparison])

  const hasClassAverage = data.some((item) => item.classAverage !== undefined)
  const hasPreviousScore = data.some((item) => item.previousScore !== undefined)

  return (
    <Card className="@container/card">
      <CardHeader className="items-center pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {(hasClassAverage || hasPreviousScore) && (
          <CardAction className="pt-2">
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
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="subject" />
            <PolarGrid />

            {/* 내 점수 */}
            <Radar
              dataKey="score"
              fill="var(--color-score)"
              fillOpacity={0.6}
              stroke="var(--color-score)"
              strokeWidth={2}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />

            {/* 반 평균 */}
            {comparison === 'class' && (
              <Radar
                dataKey="classAverage"
                fill="var(--color-classAverage)"
                fillOpacity={0.3}
                stroke="var(--color-classAverage)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{
                  r: 3,
                  fillOpacity: 0.8,
                }}
              />
            )}

            {/* 이전 점수 */}
            {comparison === 'previous' && (
              <Radar
                dataKey="previousScore"
                fill="var(--color-previousScore)"
                fillOpacity={0.3}
                stroke="var(--color-previousScore)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{
                  r: 3,
                  fillOpacity: 0.8,
                }}
              />
            )}
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        {comparison === 'previous' && averageChange !== null && (
          <div className="flex items-center gap-2 leading-none font-medium">
            {averageChange > 0 ? (
              <>
                평균 {averageChange.toFixed(1)}점 상승
                <TrendingUp className="h-4 w-4 text-primary" />
              </>
            ) : averageChange < 0 ? (
              <>
                평균 {Math.abs(averageChange).toFixed(1)}점 하락
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </>
            ) : (
              <>평균 점수 유지</>
            )}
          </div>
        )}
        {comparison === 'class' && (
          <div className="text-muted-foreground flex items-center gap-2 leading-none">
            반 평균과 비교한 성취도
          </div>
        )}
        {comparison === 'none' && (
          <div className="text-muted-foreground flex items-center gap-2 leading-none">
            전체 과목 점수 분포
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
