'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Label } from '@ui/label'
import { DatePicker } from '@ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Copy, Plus, FileText, Repeat, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createExamFromTemplate } from '@/app/actions/grades/exams'

interface ExamTemplate {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  total_questions: number | null
  passing_score: number | null
  recurring_schedule: string | null
  is_template_active: boolean | null
  description: string | null
  class_id: string | null
  classes?: { name: string } | { name: string }[] | null
  subjects?: { name: string; color: string | null } | { name: string; color: string | null }[] | null
}

interface ExamTemplatesWidgetProps {
  templates: ExamTemplate[]
}

const EXAM_TYPE_MAP: Record<string, string> = {
  vocabulary: '단어시험',
  midterm: '중간고사',
  final: '기말고사',
  quiz: '퀴즈',
  mock: '모의고사',
  assignment: '과제',
}

function getRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

export function ExamTemplatesWidget({ templates }: ExamTemplatesWidgetProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ExamTemplate | null>(null)
  const [examDate, setExamDate] = useState<Date | undefined>(() => new Date())
  const [creating, setCreating] = useState(false)

  function toISODate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const activeTemplates = templates.filter((t) => t.is_template_active !== false)

  function openCreateDialog(template: ExamTemplate) {
    setSelectedTemplate(template)
    setDialogOpen(true)
  }

  async function handleCreate() {
    if (!selectedTemplate || !examDate) return
    setCreating(true)
    try {
      const result = await createExamFromTemplate(selectedTemplate.id, toISODate(examDate))
      if (!result.success || !result.data) {
        throw new Error(result.error || '시험 생성에 실패했습니다.')
      }
      toast({
        title: '시험 생성 완료',
        description: `"${selectedTemplate.name}" 템플릿으로 시험을 생성했습니다.`,
      })
      setDialogOpen(false)
      setSelectedTemplate(null)
      router.push(`/grades/exams/${result.data.examId}`)
    } catch (error) {
      toast({
        title: '시험 생성 실패',
        description: error instanceof Error ? error.message : '시험 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                시험 템플릿
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                자주 쓰는 시험을 한 번에 등록
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              title="템플릿 관리"
              onClick={() => router.push('/grades/exam-templates')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeTemplates.length === 0 ? (
            <div className="text-center py-6 px-2 border-2 border-dashed rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground mb-3">
                등록된 템플릿이 없습니다
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/grades/exam-templates/new')}
              >
                <Plus className="h-3 w-3 mr-1" />
                템플릿 만들기
              </Button>
            </div>
          ) : (
            activeTemplates.map((template) => {
              const className = getRelation(template.classes)?.name
              const subject = getRelation(template.subjects)
              const typeLabel = template.exam_type ? EXAM_TYPE_MAP[template.exam_type] ?? template.exam_type : null

              return (
                <div
                  key={template.id}
                  className="group p-3 border rounded-lg hover:border-primary/40 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{template.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-60 group-hover:opacity-100"
                      title="이 템플릿으로 시험 만들기"
                      onClick={() => openCreateDialog(template)}
                    >
                      <Copy className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {subject?.name && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {subject.name}
                      </Badge>
                    )}
                    {typeLabel && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {typeLabel}
                      </Badge>
                    )}
                    {template.recurring_schedule && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        <Repeat className="h-2.5 w-2.5 mr-0.5" />
                        주기
                      </Badge>
                    )}
                    {className && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        · {className}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {activeTemplates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 border-dashed text-xs h-8"
              onClick={() => router.push('/grades/exam-templates')}
            >
              <Plus className="h-3 w-3 mr-1" />
              템플릿 추가·관리
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Create exam from template dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿으로 시험 만들기</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `"${selectedTemplate.name}" 템플릿의 설정을 그대로 복사해 새 시험을 생성합니다.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>시험일</Label>
              <DatePicker value={examDate} onChange={setExamDate} />
              <p className="text-xs text-muted-foreground">
                시험일만 선택하면 나머지는 템플릿 설정이 적용됩니다. 학생 배정과 추가 수정은
                생성 후 상세 페이지에서 진행하세요.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={creating || !examDate}>
              {creating ? '생성 중...' : '시험 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
