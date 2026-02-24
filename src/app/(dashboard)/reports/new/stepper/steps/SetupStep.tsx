'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { ScrollArea } from '@ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import { Search, X, UserCheck, Clock, ChevronRight, CalendarDays } from 'lucide-react'
import { type SelectedStudent, type PeriodConfig, getRecentStudents } from '../report-stepper-types'
import { formatDate, cn } from '@/lib/utils'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: { name: string } | null
  class_enrollments?: Array<{ classes: { name: string } | null }>
}

interface SetupStepProps {
  students: Student[]
  selectedStudent: SelectedStudent | null
  period: PeriodConfig
  isValid: boolean
  onSelectStudent: (student: SelectedStudent) => void
  onClearStudent: () => void
  onPeriodChange: (period: PeriodConfig) => void
  onConfirm: () => void
}

export function SetupStep({
  students,
  selectedStudent,
  period,
  isValid,
  onSelectStudent,
  onClearStudent,
  onPeriodChange,
  onConfirm,
}: SetupStepProps) {
  // ── Student state ──
  const [search, setSearch] = useState('')
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(!selectedStudent)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const recentStudents = useMemo(() => getRecentStudents(), [])

  // ── Period constants ──
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1

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

  // ── Student helpers ──
  const allClasses = useMemo(() => {
    const classSet = new Set<string>()
    students.forEach((s) => {
      s.class_enrollments?.forEach((e) => {
        if (e.classes?.name) classSet.add(e.classes.name)
      })
    })
    return Array.from(classSet).sort()
  }, [students])

  const filteredStudents = useMemo(() => {
    let result = students
    if (activeClass) {
      result = result.filter((s) =>
        s.class_enrollments?.some((e) => e.classes?.name === activeClass)
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          (s.users?.name || '').toLowerCase().includes(q) ||
          s.student_code.toLowerCase().includes(q)
      )
    }
    return result
  }, [students, search, activeClass])

  function buildSelected(s: Student): SelectedStudent {
    return {
      id: s.id,
      name: s.users?.name || '이름 없음',
      studentCode: s.student_code,
      grade: s.grade,
      classes:
        s.class_enrollments
          ?.map((e) => e.classes?.name)
          .filter((n): n is string => Boolean(n)) ?? [],
    }
  }

  function handleSelect(studentId: string) {
    const found = students.find((s) => s.id === studentId)
    if (!found) return
    onSelectStudent(buildSelected(found))
    setIsSearching(false)
    setSearch('')
    setActiveClass(null)
  }

  function handleRecentClick(recent: SelectedStudent) {
    const found = students.find((s) => s.id === recent.id)
    if (!found) return
    onSelectStudent(buildSelected(found))
    setIsSearching(false)
  }

  function handleChangeStudent() {
    setIsSearching(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function handleClear() {
    onClearStudent()
    setIsSearching(true)
    setSearch('')
    setActiveClass(null)
  }

  useEffect(() => {
    if (!selectedStudent) setIsSearching(true)
  }, [selectedStudent])

  // ── Period helpers ──
  const activePreset = useMemo(() => {
    if (period.type === 'monthly') {
      if (period.year === currentYear && period.month === currentMonth) return 'thisMonth'
      if (period.year === lastMonthYear && period.month === lastMonth) return 'lastMonth'
    } else {
      if (
        period.startDate === weekRanges.thisWeek.start &&
        period.endDate === weekRanges.thisWeek.end
      )
        return 'thisWeek'
      if (
        period.startDate === weekRanges.lastWeek.start &&
        period.endDate === weekRanges.lastWeek.end
      )
        return 'lastWeek'
    }
    return null
  }, [period, currentYear, currentMonth, lastMonthYear, lastMonth, weekRanges])

  const periodSummary = useMemo(() => {
    if (period.type === 'monthly' && period.year && period.month)
      return `${period.year}년 ${period.month}월 · 월간 리포트`
    if (period.type === 'weekly' && period.startDate && period.endDate)
      return `${period.startDate} ~ ${period.endDate} · 주간 리포트`
    return null
  }, [period])

  function handleTypeChange(type: 'weekly' | 'monthly') {
    if (type === 'monthly') {
      onPeriodChange({
        type: 'monthly',
        year: period.year ?? currentYear,
        month: period.month ?? currentMonth,
      })
    } else {
      onPeriodChange({ type: 'weekly', startDate: period.startDate, endDate: period.endDate })
    }
  }

  const presets =
    period.type === 'monthly'
      ? [
          {
            key: 'thisMonth',
            label: '이번 달',
            action: () =>
              onPeriodChange({ type: 'monthly', year: currentYear, month: currentMonth }),
          },
          {
            key: 'lastMonth',
            label: '지난 달',
            action: () =>
              onPeriodChange({ type: 'monthly', year: lastMonthYear, month: lastMonth }),
          },
        ]
      : [
          {
            key: 'thisWeek',
            label: '이번 주',
            action: () =>
              onPeriodChange({
                type: 'weekly',
                startDate: weekRanges.thisWeek.start,
                endDate: weekRanges.thisWeek.end,
              }),
          },
          {
            key: 'lastWeek',
            label: '지난 주',
            action: () =>
              onPeriodChange({
                type: 'weekly',
                startDate: weekRanges.lastWeek.start,
                endDate: weekRanges.lastWeek.end,
              }),
          },
        ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 & 기간 설정</CardTitle>
        <CardDescription>리포트를 생성할 학생과 기간을 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Student Section ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            학생 선택
          </p>

          {/* Selected student card */}
          {selectedStudent && !isSearching && (
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold select-none">
                  {selectedStudent.name[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">{selectedStudent.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedStudent.studentCode}
                    </Badge>
                    {selectedStudent.grade && (
                      <Badge variant="outline" className="text-xs">
                        {selectedStudent.grade}
                      </Badge>
                    )}
                  </div>
                  {selectedStudent.classes.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedStudent.classes.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleChangeStudent}>
                    변경
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Inline search panel */}
          {isSearching && (
            <div className="space-y-3">
              {recentStudents.length > 0 && !search && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    최근 선택
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentStudents.map((recent) => {
                      const exists = students.some((s) => s.id === recent.id)
                      if (!exists) return null
                      return (
                        <button
                          key={recent.id}
                          type="button"
                          onClick={() => handleRecentClick(recent)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all"
                        >
                          <span className="font-medium">{recent.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {recent.studentCode}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder="이름 또는 학번으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="검색어 지우기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {allClasses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveClass(null)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border transition-all',
                      !activeClass
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted border-border'
                    )}
                  >
                    전체
                  </button>
                  {allClasses.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setActiveClass(activeClass === cls ? null : cls)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs border transition-all',
                        activeClass === cls
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground hover:bg-muted border-border'
                      )}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className="h-56 rounded-lg border">
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-25" />
                    <p className="text-sm">
                      {search || activeClass ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-0.5">
                    {filteredStudents.map((s) => {
                      const name = s.users?.name || '이름 없음'
                      const classes =
                        s.class_enrollments
                          ?.map((e) => e.classes?.name)
                          .filter((n): n is string => Boolean(n)) ?? []
                      const isSelected = selectedStudent?.id === s.id

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelect(s.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                          )}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold select-none',
                              isSelected
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{name}</span>
                              {isSelected && (
                                <UserCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.student_code}
                              {s.grade ? ` · ${s.grade}` : ''}
                              {classes.length > 0 ? ` · ${classes.join(', ')}` : ''}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredStudents.length}명 표시</span>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setIsSearching(false)}
                    className="hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Period Section (shown after student selected) ── */}
        {selectedStudent && !isSearching && (
          <div className="space-y-4">
            <div className="h-px bg-border" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              유형 & 기간
            </p>

            <div>
              <label className="text-sm font-medium mb-2 block">리포트 유형</label>
              <Tabs
                value={period.type}
                onValueChange={(v) => handleTypeChange(v as 'weekly' | 'monthly')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="monthly">월간</TabsTrigger>
                  <TabsTrigger value="weekly">주간</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

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

            {periodSummary && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-primary">{periodSummary}</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button onClick={onConfirm} disabled={!isValid} className="gap-1">
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
