'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react'
import { TemplateSection } from '@/components/features/reports/template-section'
import { getReportTemplates } from '@/app/actions/report-templates'
import { cn } from '@/lib/utils'
import type { CategoryTemplates, ReportContextData, ReportTemplateCategory } from '@/core/types/report-template.types'
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

export function CommentStep({ comment, onChange, onConfirm, onBack, reportData }: CommentStepProps) {
  const [templates, setTemplates] = useState<CategoryTemplates[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  // blur 이후 오류 표시 여부를 필드별로 추적
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

  useEffect(() => {
    if (templatesLoaded || !context) return
    let cancelled = false
    getReportTemplates(context).then((result) => {
      if (cancelled) return
      if (result.success && result.data) setTemplates(result.data)
      setTemplatesLoaded(true)
    })
    return () => { cancelled = true }
  }, [context, templatesLoaded])

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>코멘트 작성</CardTitle>
            <CardDescription>
              강사 코멘트를 작성하세요. 템플릿을 클릭하면 자동으로 입력됩니다.
            </CardDescription>
          </div>
          {/* 작성 진행률 */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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

              {/* 템플릿 칩 */}
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
  )
}
