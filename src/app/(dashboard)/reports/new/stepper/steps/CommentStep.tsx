'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { Switch } from '@ui/switch'
import { ChevronLeft, ChevronRight, Keyboard, MessageSquareOff, MessageSquare, BarChart2, CalendarDays, Loader2, Sparkles } from 'lucide-react'
import { TemplateSection } from '@/components/features/reports/template-section'
import { getReportTemplates } from '@/app/actions/reports/templates'
import {
  useAiCommentAvailableQuery,
  useGenerateAiCommentMutation,
} from '@/hooks/mutations/use-ai-comment-mutation'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/query-keys'
import { useReportStore } from '@/lib/stores/report.store'
import type { ReportContextData, ReportTemplateCategory } from '@/core/types/report-template.types'
import type { ReportData } from '@/core/types/report.types'
import type { CommentDraft } from '../report-stepper-types'

interface CommentStepProps {
  comment: CommentDraft
  onChange: (patch: Partial<CommentDraft>) => void
  onConfirm: () => void
  onBack: () => void
  reportData: ReportData | null
}

const FIELDS: Array<{
  key: keyof CommentDraft
  label: string
  category: ReportTemplateCategory
  placeholder: string
  required: boolean
  maxLength: number
}> = [
  {
    key: 'summary',
    label: '총평',
    category: 'summary',
    placeholder: '학생의 전반적인 학습 상태에 대한 종합 평가를 입력하세요',
    required: true,
    maxLength: 500,
  },
  {
    key: 'strengths',
    label: '잘한 점',
    category: 'strengths',
    placeholder: '학생이 잘한 점을 입력하세요',
    required: false,
    maxLength: 300,
  },
  {
    key: 'improvements',
    label: '보완할 점',
    category: 'improvements',
    placeholder: '개선이 필요한 부분을 입력하세요',
    required: false,
    maxLength: 300,
  },
  {
    key: 'nextGoals',
    label: '다음 목표',
    category: 'nextGoals',
    placeholder: '다음 기간의 학습 목표를 입력하세요',
    required: false,
    maxLength: 300,
  },
]

const REPORT_OPTIONS = [
  {
    id: 'comment',
    icon: MessageSquare,
    label: '강사 코멘트',
    description: '총평, 잘한 점, 보완할 점, 다음 목표를 리포트에 포함합니다',
    checked: (s: ReturnType<typeof useReportStore.getState>) => !s.skipComment,
    toggle: (s: ReturnType<typeof useReportStore.getState>, v: boolean) => s.setSkipComment(!v),
  },
  {
    id: 'attendance-rate',
    icon: BarChart2,
    label: '출석률',
    description: '출석률 수치를 리포트에 표시합니다',
    checked: (s: ReturnType<typeof useReportStore.getState>) => !s.skipAttendanceRate,
    toggle: (s: ReturnType<typeof useReportStore.getState>, v: boolean) => s.setSkipAttendanceRate(!v),
  },
  {
    id: 'attendance-calendar',
    icon: CalendarDays,
    label: '출석 현황',
    description: '월별 출석 캘린더를 리포트에 표시합니다',
    checked: (s: ReturnType<typeof useReportStore.getState>) => !s.skipAttendanceCalendar,
    toggle: (s: ReturnType<typeof useReportStore.getState>, v: boolean) => s.setSkipAttendanceCalendar(!v),
  },
]

export function CommentStep({ comment, onChange, onConfirm, onBack, reportData }: CommentStepProps) {
  const store = useReportStore()
  const { skipComment } = store
  const [touched, setTouched] = useState<Partial<Record<keyof CommentDraft, boolean>>>({})

  const filledCount = FIELDS.filter((f) => comment[f.key].trim()).length

  const context: ReportContextData | null = useMemo(() => {
    if (!reportData) return null
    const scores = reportData.scores || []
    const withData = scores.filter((s) => s.current !== null)
    const valid = scores.filter((s) => s.change !== null)
    return {
      studentName: reportData.student?.name ?? reportData.studentName ?? '',
      attendanceRate: reportData.attendance?.rate ?? 0,
      homeworkRate: reportData.homework?.rate ?? 0,
      averageScore:
        withData.length > 0
          ? Math.round(withData.reduce((sum, s) => sum + (s.current ?? 0), 0) / withData.length)
          : 0,
      scoreChange:
        valid.length > 0
          ? Math.round((valid.reduce((sum, s) => sum + (s.change ?? 0), 0) / valid.length) * 10) / 10
          : 0,
    }
  }, [reportData])

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.reports.templates(context),
    queryFn: async () => {
      const result = await getReportTemplates(context!)
      return result.data ?? []
    },
    enabled: !!context && !skipComment,
    staleTime: 5 * 60 * 1000,
  })

  // AI 초안 — 서버에 API 키가 설정된 경우에만 버튼 노출
  const { data: aiAvailable = false } = useAiCommentAvailableQuery(!skipComment)
  const aiDraftMutation = useGenerateAiCommentMutation((draft) => onChange(draft))

  const handleGenerateAiDraft = useCallback(() => {
    if (!reportData) return
    aiDraftMutation.mutate({
      studentName: reportData.student?.name ?? reportData.studentName ?? '',
      grade: reportData.student?.grade ?? reportData.grade ?? undefined,
      period: reportData.period,
      attendance: reportData.attendance,
      homework: reportData.homework,
      scores: reportData.scores.map((s) => ({
        category: s.category,
        current: s.current,
        previous: s.previous,
        change: s.change,
        average: s.average,
        retestRate: s.retestRate,
      })),
    })
  }, [reportData, aiDraftMutation])

  // Ctrl+Enter 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onConfirm])

  const handleTemplateSelect = useCallback(
    (category: ReportTemplateCategory, content: string) => {
      const fieldMap: Record<ReportTemplateCategory, keyof CommentDraft> = {
        summary: 'summary',
        strengths: 'strengths',
        improvements: 'improvements',
        nextGoals: 'nextGoals',
      }
      const field = fieldMap[category]
      if (field) onChange({ [field]: content })
    },
    [onChange]
  )

  return (
    <div className="space-y-4">
      {/* 발송 옵션 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">발송 옵션</CardTitle>
          <CardDescription>보호자에게 전달되는 리포트에 포함할 항목을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="divide-y">
            {REPORT_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                      <Icon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`report-option-${option.id}`}
                    checked={option.checked(store)}
                    onCheckedChange={(v) => option.toggle(store, v)}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 코멘트 작성 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle>코멘트 작성</CardTitle>
              <CardDescription>
                강사 코멘트를 작성하세요. 템플릿을 클릭하면 자동으로 입력됩니다.
              </CardDescription>
              {!skipComment && aiAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={handleGenerateAiDraft}
                  disabled={aiDraftMutation.isPending || !reportData}
                >
                  {aiDraftMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiDraftMutation.isPending ? 'AI 초안 생성 중...' : 'AI 초안 생성'}
                </Button>
              )}
            </div>

            {/* 작성 진행률 */}
            {!skipComment && (
              <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                <span className="text-xs text-muted-foreground">{filledCount} / {FIELDS.length} 작성</span>
                <div className="flex gap-1">
                  {FIELDS.map((f) => (
                    <div
                      key={f.key}
                      className={cn(
                        'h-1.5 w-8 rounded-full transition-colors',
                        comment[f.key].trim()
                          ? 'bg-primary'
                          : f.required
                            ? 'bg-muted-foreground/30'
                            : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {skipComment ? (
            /* 코멘트 생략 안내 */
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
              <MessageSquareOff className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">코멘트 없이 리포트를 발송합니다</p>
              <p className="text-xs">보호자에게 전달되는 리포트에 강사 코멘트가 포함되지 않습니다.</p>
            </div>
          ) : (
            /* 코멘트 입력 폼 */
            <>
              {FIELDS.map((field) => {
                const categoryData = templates.find((t) => t.category === field.category)
                const value = comment[field.key]
                const showError = field.required && touched[field.key] && !value.trim()

                return (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {field.label}
                        {field.required ? (
                          <span className="text-destructive ml-1">*</span>
                        ) : (
                          <span className="text-muted-foreground text-xs ml-1.5">(선택)</span>
                        )}
                      </label>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          value.length > field.maxLength * 0.9
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        )}
                      >
                        {value.length} / {field.maxLength}
                      </span>
                    </div>

                    {categoryData && context && (
                      <TemplateSection
                        categoryData={categoryData}
                        context={context}
                        onSelect={(content) => handleTemplateSelect(field.category, content)}
                      />
                    )}

                    <Textarea
                      value={value}
                      onChange={(e) => onChange({ [field.key]: e.target.value })}
                      onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      className={cn(
                        field.key === 'summary' ? 'min-h-[100px]' : 'min-h-[80px]',
                        showError && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />

                    {showError && (
                      <p className="text-xs text-destructive">필수 항목입니다</p>
                    )}
                  </div>
                )
              })}

              {/* 단축키 안내 */}
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" />
                <span>Ctrl+Enter로 다음 단계로 이동</span>
              </div>
            </>
          )}

          {/* 내비게이션 */}
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
    </div>
  )
}
