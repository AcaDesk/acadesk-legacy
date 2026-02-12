'use client'

import { useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { Textarea } from '@ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form'
import { useToast } from '@/hooks/use-toast'
import type { ReportWithStudent } from '@/core/types/report.types'

const commentSchema = z.object({
  summary: z.string().min(1, '총평을 입력해주세요'),
  strengths: z.string(),
  improvements: z.string(),
  nextGoals: z.string(),
})

type CommentFormData = z.infer<typeof commentSchema>

interface CommentEditorProps {
  reports: ReportWithStudent[]
  currentIndex: number
  onSave: (reportId: string, comment: CommentFormData) => Promise<void>
  onSkip: () => void
  onPrevious: () => void
  onComplete: () => void
}

export function CommentEditor({
  reports,
  currentIndex,
  onSave,
  onSkip,
  onPrevious,
  onComplete,
}: CommentEditorProps) {
  const { toast } = useToast()
  const report = reports[currentIndex]
  const isLast = currentIndex === reports.length - 1

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: getDefaultValues(report),
  })

  // Reset form when navigating between reports
  useEffect(() => {
    form.reset(getDefaultValues(report))
  }, [currentIndex, report, form])

  const handleSaveAndNext = useCallback(async (data: CommentFormData) => {
    try {
      await onSave(report.id, data)
      toast({ title: '코멘트 저장됨' })
      if (isLast) {
        onComplete()
      }
    } catch {
      toast({
        title: '저장 실패',
        description: '코멘트를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }, [report.id, isLast, onSave, onComplete, toast])

  // Ctrl+Enter shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        form.handleSubmit(handleSaveAndNext)()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [form, handleSaveAndNext])

  const attendanceRate = report.content?.attendance?.rate ?? 0
  const rawScores = report.content?.scores
  const scores = Array.isArray(rawScores) ? rawScores : []
  const scoresWithData = scores.filter((s) => s.current !== null)
  const avgScore = scoresWithData.length > 0
    ? Math.round(scoresWithData.reduce((sum, s) => sum + (s.current || 0), 0) / scoresWithData.length)
    : null

  const percentage = Math.round(((currentIndex + 1) / reports.length) * 100)

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentIndex + 1} / {reports.length} 완료
          </span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Report summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{report.students?.users?.name || '이름 없음'}</span>
            <div className="flex items-center gap-2">
              <Badge variant={report.report_type === 'weekly' ? 'secondary' : 'default'}>
                {report.report_type === 'weekly' ? '주간' : '월간'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">기간</span>
              <p className="font-medium">{formatPeriodShort(report.period_start, report.period_end)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">출석률</span>
              <p className="font-medium">{attendanceRate}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">평균점수</span>
              <p className="font-medium">{avgScore !== null ? `${avgScore}점` : '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">학번</span>
              <p className="font-medium">{report.students?.student_code || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment form */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveAndNext)} className="space-y-4">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>총평 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="학생의 전반적인 학습 상태에 대한 종합 평가를 입력하세요"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strengths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>잘한 점</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="학생이 잘한 점을 입력하세요"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="improvements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>개선할 점</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="개선이 필요한 부분을 입력하세요"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>다음 목표</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="다음 기간의 학습 목표를 입력하세요"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action bar */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    className="gap-1"
                  >
                    <SkipForward className="h-4 w-4" />
                    건너뛰기
                  </Button>
                  <Button type="submit" size="sm" className="gap-1">
                    {isLast ? '저장 후 완료' : '저장 후 다음'}
                    {!isLast && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-right">
                Ctrl+Enter로 빠르게 저장
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function getDefaultValues(report: ReportWithStudent): CommentFormData {
  const comment = report.content?.comment
  if (comment) {
    return {
      summary: comment.summary || '',
      strengths: comment.strengths || '',
      improvements: comment.improvements || '',
      nextGoals: comment.nextGoals || '',
    }
  }

  // Legacy fallback
  const legacy = report.content?.instructorComment || report.content?.overallComment || ''
  return {
    summary: legacy,
    strengths: '',
    improvements: '',
    nextGoals: '',
  }
}

function formatPeriodShort(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`
}
