'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { Skeleton } from '@ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ReportData } from '@/core/types/report.types'
import type { DataWarning } from '../report-stepper-types'

interface DataReviewStepProps {
  loading: boolean
  loaded: boolean
  error: string | null
  reportData: ReportData | null
  warnings: DataWarning[]
  onFetch: () => void
  onNext: () => void
  onBack: () => void
}

export function DataReviewStep({
  loading,
  loaded,
  error,
  reportData,
  warnings,
  onFetch,
  onNext,
  onBack,
}: DataReviewStepProps) {
  useEffect(() => {
    if (!loaded && !loading && !error) {
      onFetch()
    }
  }, [loaded, loading, error, onFetch])

  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>데이터 수집 중...</CardTitle>
          <CardDescription>학생의 학습 데이터를 분석하고 있습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  // 오류 상태
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>데이터 수집 실패</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>오류가 발생했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <Button onClick={onFetch} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) return null

  const attendanceRate = reportData.attendance?.rate ?? 0
  const homeworkRate = reportData.homework?.rate ?? 0
  const scores = reportData.scores || []
  const scoresWithData = scores.filter((s) => s.current !== null)
  const avgScore =
    scoresWithData.length > 0
      ? Math.round(scoresWithData.reduce((sum, s) => sum + (s.current ?? 0), 0) / scoresWithData.length)
      : null

  const avgChange = (() => {
    const valid = scores.filter((s) => s.change !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((sum, s) => sum + (s.change ?? 0), 0) / valid.length) * 10) / 10
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 확인</CardTitle>
        <CardDescription>
          수집된 학습 데이터를 확인하세요. 경고가 있어도 계속 진행할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* KPI 카드 3개 */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="출석률"
            value={`${Math.round(attendanceRate)}%`}
            sub={`${reportData.attendance.present} / ${reportData.attendance.total}일`}
            rate={attendanceRate}
            barColor="bg-blue-500"
          />
          <KpiCard
            label="과제 완료율"
            value={`${Math.round(homeworkRate)}%`}
            sub={`${reportData.homework.completed} / ${reportData.homework.total}개`}
            rate={homeworkRate}
            barColor="bg-emerald-500"
          />
          <KpiCard
            label="평균 성적"
            value={avgScore !== null ? `${avgScore}점` : '-'}
            sub={
              avgChange !== null ? (
                <span className={cn('flex items-center gap-0.5', avgChange > 0 ? 'text-emerald-600' : avgChange < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {avgChange > 0 ? <TrendingUp className="h-3 w-3" /> : avgChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {avgChange > 0 ? '+' : ''}{avgChange}점
                </span>
              ) : '이전 데이터 없음'
            }
            rate={avgScore !== null ? avgScore : null}
            barColor="bg-primary"
          />
        </div>

        {/* 과목별 성적 (데이터 있을 때만) */}
        {scoresWithData.length > 0 && (
          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">과목별 성적</p>
            </div>
            <div className="divide-y">
              {scoresWithData.map((score) => (
                <ScoreRow key={score.category} score={score} />
              ))}
            </div>
          </div>
        )}

        {/* 경고 */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w) => (
              <Alert key={w.type} variant={w.severity === 'warning' ? 'destructive' : 'default'}>
                {w.severity === 'warning' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>{w.message}</span>
                  {w.quickFixUrl && (
                    <Link href={w.quickFixUrl} target="_blank">
                      <Button variant="ghost" size="sm" className="gap-1 h-auto py-1 shrink-0">
                        데이터 입력
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* 정상 수집 완료 */}
        {warnings.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              모든 데이터가 정상적으로 수집되었습니다.
            </p>
          </div>
        )}

        {/* 내비게이션 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button onClick={onNext} className="gap-1">
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 내부 컴포넌트 ──────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  rate,
  barColor,
}: {
  label: string
  value: string
  sub: React.ReactNode
  rate: number | null
  barColor: string
}) {
  const pct = rate !== null ? Math.min(100, Math.max(0, rate)) : null

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function ScoreRow({
  score,
}: {
  score: { category: string; current: number | null; previous: number | null; change: number | null }
}) {
  const change = score.change

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{score.category}</span>
      <div className="flex items-center gap-3">
        {score.previous !== null && (
          <span className="text-xs text-muted-foreground">{score.previous}점</span>
        )}
        <span className="font-semibold tabular-nums">{score.current}점</span>
        {change !== null && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              change > 0 ? 'text-emerald-600' : change < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {change > 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  )
}
