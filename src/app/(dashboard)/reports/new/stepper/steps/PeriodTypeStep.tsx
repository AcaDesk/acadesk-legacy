'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { PeriodConfig } from '../report-stepper-types'

interface PeriodTypeStepProps {
  period: PeriodConfig
  onPeriodChange: (period: PeriodConfig) => void
  onConfirm: () => void
  onBack: () => void
}

export function PeriodTypeStep({ period, onPeriodChange, onConfirm, onBack }: PeriodTypeStepProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // 이번 주 / 지난 주 범위 계산
  const weekRanges = useMemo(() => {
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const thisSunday = new Date(thisMonday)
    thisSunday.setDate(thisMonday.getDate() + 6)

    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)

    return {
      thisWeek: { start: formatDate(thisMonday), end: formatDate(thisSunday) },
      lastWeek: { start: formatDate(lastMonday), end: formatDate(lastSunday) },
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1

  // 현재 선택된 프리셋 감지
  const activePreset = useMemo(() => {
    if (period.type === 'monthly') {
      if (period.year === currentYear && period.month === currentMonth) return 'thisMonth'
      if (period.year === lastMonthYear && period.month === lastMonth) return 'lastMonth'
    } else {
      if (period.startDate === weekRanges.thisWeek.start && period.endDate === weekRanges.thisWeek.end)
        return 'thisWeek'
      if (period.startDate === weekRanges.lastWeek.start && period.endDate === weekRanges.lastWeek.end)
        return 'lastWeek'
    }
    return null
  }, [period, currentYear, currentMonth, lastMonthYear, lastMonth, weekRanges])

  // 선택된 기간을 읽기 쉬운 텍스트로
  const periodSummary = useMemo(() => {
    if (period.type === 'monthly' && period.year && period.month) {
      return `${period.year}년 ${period.month}월 · 월간 리포트`
    }
    if (period.type === 'weekly' && period.startDate && period.endDate) {
      return `${period.startDate} ~ ${period.endDate} · 주간 리포트`
    }
    return null
  }, [period])

  // 유효성 체크
  const isValid = useMemo(() => {
    if (period.type === 'monthly') return !!(period.year && period.month)
    return !!(period.startDate && period.endDate && period.startDate <= period.endDate)
  }, [period])

  function handleTypeChange(type: 'weekly' | 'monthly') {
    if (type === 'monthly') {
      onPeriodChange({ type: 'monthly', year: period.year ?? currentYear, month: period.month ?? currentMonth })
    } else {
      onPeriodChange({ type: 'weekly', startDate: period.startDate, endDate: period.endDate })
    }
  }

  const presets =
    period.type === 'monthly'
      ? [
          { key: 'thisMonth', label: '이번 달', action: () => onPeriodChange({ type: 'monthly', year: currentYear, month: currentMonth }) },
          { key: 'lastMonth', label: '지난 달', action: () => onPeriodChange({ type: 'monthly', year: lastMonthYear, month: lastMonth }) },
        ]
      : [
          { key: 'thisWeek', label: '이번 주', action: () => onPeriodChange({ type: 'weekly', startDate: weekRanges.thisWeek.start, endDate: weekRanges.thisWeek.end }) },
          { key: 'lastWeek', label: '지난 주', action: () => onPeriodChange({ type: 'weekly', startDate: weekRanges.lastWeek.start, endDate: weekRanges.lastWeek.end }) },
        ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>유형 및 기간 설정</CardTitle>
        <CardDescription>리포트 유형과 대상 기간을 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 리포트 유형 탭 */}
        <div>
          <label className="text-sm font-medium mb-2 block">리포트 유형</label>
          <Tabs value={period.type} onValueChange={(v) => handleTypeChange(v as 'weekly' | 'monthly')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">월간</TabsTrigger>
              <TabsTrigger value="weekly">주간</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 빠른 선택 (유형에 맞는 프리셋만 표시) */}
        <div>
          <label className="text-sm font-medium mb-2 block">빠른 선택</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={preset.action}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm border transition-all font-medium',
                  activePreset === preset.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground hover:bg-muted border-border'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 기간 직접 입력 */}
        {period.type === 'monthly' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">연도</label>
              <Select
                value={(period.year ?? currentYear).toString()}
                onValueChange={(v) => onPeriodChange({ ...period, year: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">월</label>
              <Select
                value={(period.month ?? currentMonth).toString()}
                onValueChange={(v) => onPeriodChange({ ...period, month: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <DatePicker
                value={period.startDate ? new Date(period.startDate + 'T00:00:00') : undefined}
                onChange={(d) => onPeriodChange({ ...period, startDate: d ? formatDate(d) : undefined })}
                placeholder="시작일 선택"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <DatePicker
                value={period.endDate ? new Date(period.endDate + 'T00:00:00') : undefined}
                onChange={(d) => onPeriodChange({ ...period, endDate: d ? formatDate(d) : undefined })}
                placeholder="종료일 선택"
              />
            </div>
            {period.startDate && period.endDate && period.startDate > period.endDate && (
              <p className="text-sm text-destructive md:col-span-2">
                시작일은 종료일보다 이전이어야 합니다.
              </p>
            )}
          </div>
        )}

        {/* 선택된 기간 요약 */}
        {periodSummary && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-primary">{periodSummary}</span>
          </div>
        )}

        {/* 내비게이션 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button onClick={onConfirm} disabled={!isValid} className="gap-1">
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
