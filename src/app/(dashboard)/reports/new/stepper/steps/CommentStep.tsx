'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TemplateSection } from '@/components/features/reports/template-section'
import { getReportTemplates } from '@/app/actions/report-templates'
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
}> = [
  { key: 'summary', label: '총평', category: 'summary', placeholder: '학생의 전반적인 학습 상태에 대한 종합 평가를 입력하세요', required: true },
  { key: 'strengths', label: '잘한 점', category: 'strengths', placeholder: '학생이 잘한 점을 입력하세요', required: false },
  { key: 'improvements', label: '보완할 점', category: 'improvements', placeholder: '개선이 필요한 부분을 입력하세요', required: false },
  { key: 'nextGoals', label: '다음 목표', category: 'nextGoals', placeholder: '다음 기간의 학습 목표를 입력하세요', required: false },
]

export function CommentStep({ comment, onChange, onConfirm, onBack, reportData }: CommentStepProps) {
  const [templates, setTemplates] = useState<CategoryTemplates[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Build context for template matching
  const context: ReportContextData | null = useMemo(() => {
    if (!reportData) return null
    const scores = reportData.scores || []
    const withData = scores.filter((s) => s.current !== null)
    const valid = scores.filter((s) => s.change !== null)
    return {
      studentName: reportData.student?.name || reportData.studentName || '',
      attendanceRate: reportData.attendance?.rate ?? 0,
      homeworkRate: reportData.homework?.rate ?? 0,
      averageScore: withData.length > 0
        ? Math.round(withData.reduce((sum, s) => sum + (s.current || 0), 0) / withData.length)
        : 0,
      scoreChange: valid.length > 0
        ? Math.round((valid.reduce((sum, s) => sum + (s.change || 0), 0) / valid.length) * 10) / 10
        : 0,
    }
  }, [reportData])

  // Load templates
  useEffect(() => {
    if (templatesLoaded || !context) return
    let cancelled = false
    getReportTemplates(context).then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setTemplates(result.data)
      }
      setTemplatesLoaded(true)
    })
    return () => { cancelled = true }
  }, [context, templatesLoaded])

  // Ctrl+Enter shortcut
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
      // Map template category to comment field
      const fieldMap: Record<ReportTemplateCategory, keyof CommentDraft> = {
        summary: 'summary',
        strengths: 'strengths',
        improvements: 'improvements',
        nextGoals: 'nextGoals',
      }
      const field = fieldMap[category]
      if (field) {
        onChange({ [field]: content })
      }
    },
    [onChange]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>코멘트 작성</CardTitle>
        <CardDescription>
          강사 코멘트를 작성하세요. 템플릿을 클릭하면 자동으로 입력됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {FIELDS.map((field) => {
          const categoryData = templates.find((t) => t.category === field.category)

          return (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>

              {/* Template chips */}
              {categoryData && context && (
                <TemplateSection
                  categoryData={categoryData}
                  context={context}
                  onSelect={(content) => handleTemplateSelect(field.category, content)}
                />
              )}

              <Textarea
                value={comment[field.key]}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className={field.key === 'summary' ? 'min-h-[100px]' : 'min-h-[80px]'}
              />
              {field.required && !comment[field.key].trim() && (
                <p className="text-xs text-destructive">필수 항목입니다</p>
              )}
            </div>
          )
        })}

        <p className="text-xs text-muted-foreground text-right">
          Ctrl+Enter로 다음 단계로 이동
        </p>

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
