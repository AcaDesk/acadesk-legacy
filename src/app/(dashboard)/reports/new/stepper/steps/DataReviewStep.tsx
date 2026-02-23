'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { Skeleton } from '@ui/skeleton'
import { ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
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
  // Auto-fetch on mount
  useEffect(() => {
    if (!loaded && !loading && !error) {
      onFetch()
    }
  }, [loaded, loading, error, onFetch])

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>데이터 수집 중...</CardTitle>
          <CardDescription>학생의 학습 데이터를 수집하고 있습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  // Error state
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

  // Compute KPIs
  const attendanceRate = reportData.attendance?.rate ?? 0
  const homeworkRate = reportData.homework?.rate ?? 0
  const scores = reportData.scores || []
  const scoresWithData = scores.filter((s) => s.current !== null)
  const avgScore =
    scoresWithData.length > 0
      ? Math.round(scoresWithData.reduce((sum, s) => sum + (s.current || 0), 0) / scoresWithData.length)
      : null

  const avgChange = (() => {
    const valid = scores.filter((s) => s.change !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((sum, s) => sum + (s.change || 0), 0) / valid.length) * 10) / 10
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 확인</CardTitle>
        <CardDescription>수집된 학습 데이터를 확인하세요. 경고가 있어도 계속 진행할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="출석률"
            value={`${Math.round(attendanceRate)}%`}
            sub={`${reportData.attendance.present}/${reportData.attendance.total}일`}
            color="text-blue-600"
          />
          <KpiCard
            label="과제 완료율"
            value={`${Math.round(homeworkRate)}%`}
            sub={`${reportData.homework.completed}/${reportData.homework.total}개`}
            color="text-green-600"
          />
          <KpiCard
            label="평균 성적"
            value={avgScore !== null ? `${avgScore}점` : '-'}
            sub={
              avgChange !== null
                ? `${avgChange > 0 ? '+' : ''}${avgChange}점 변화`
                : '이전 데이터 없음'
            }
            color="text-primary"
          />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w) => (
              <Alert key={w.type} variant={w.severity === 'warning' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{w.message}</span>
                  {w.quickFixUrl && (
                    <Link href={w.quickFixUrl} target="_blank">
                      <Button variant="ghost" size="sm" className="gap-1 h-auto py-1">
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

        {/* Success indicator */}
        {warnings.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              모든 데이터가 정상적으로 수집되었습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
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

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
