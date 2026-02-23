'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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

  function handleTypeChange(type: 'weekly' | 'monthly') {
    if (type === 'monthly') {
      onPeriodChange({
        type: 'monthly',
        year: period.year || currentYear,
        month: period.month || currentMonth,
      })
    } else {
      onPeriodChange({
        type: 'weekly',
        startDate: period.startDate,
        endDate: period.endDate,
      })
    }
  }

  // Preset buttons
  function setThisMonth() {
    onPeriodChange({ type: 'monthly', year: currentYear, month: currentMonth })
  }

  function setLastMonth() {
    const lm = currentMonth === 1 ? 12 : currentMonth - 1
    const ly = currentMonth === 1 ? currentYear - 1 : currentYear
    onPeriodChange({ type: 'monthly', year: ly, month: lm })
  }

  function setThisWeek() {
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    onPeriodChange({
      type: 'weekly',
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>유형 및 기간 설정</CardTitle>
        <CardDescription>리포트 유형과 대상 기간을 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report type tabs */}
        <div>
          <label className="text-sm font-medium mb-2 block">리포트 유형</label>
          <Tabs value={period.type} onValueChange={(v) => handleTypeChange(v as 'weekly' | 'monthly')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">월간</TabsTrigger>
              <TabsTrigger value="weekly">주간</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">빠른 선택</label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setThisMonth}>
              이번 달
            </Button>
            <Button variant="outline" size="sm" onClick={setLastMonth}>
              지난 달
            </Button>
            <Button variant="outline" size="sm" onClick={setThisWeek}>
              이번 주
            </Button>
          </div>
        </div>

        {/* Period inputs */}
        {period.type === 'monthly' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">연도</label>
              <Select
                value={(period.year || currentYear).toString()}
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
                value={(period.month || currentMonth).toString()}
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
                onChange={(d) =>
                  onPeriodChange({ ...period, startDate: d ? formatDate(d) : undefined })
                }
                placeholder="시작일 선택"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <DatePicker
                value={period.endDate ? new Date(period.endDate + 'T00:00:00') : undefined}
                onChange={(d) =>
                  onPeriodChange({ ...period, endDate: d ? formatDate(d) : undefined })
                }
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

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button onClick={onConfirm} className="gap-1">
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
