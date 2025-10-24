'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { Card, CardContent } from '@ui/card'
import { Separator } from '@ui/separator'
import { useToast } from '@/hooks/use-toast'
import { gradeHomework } from '@/app/actions/homeworks'
import {
  Star,
  User,
  Calendar,
  FileText,
  Paperclip,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

interface HomeworkWithSubmission {
  id: string
  tenant_id: string
  student_id: string
  title: string
  description: string | null
  subject: string | null
  priority: string
  due_date: string
  completed_at: string | null
  verified_at: string | null
  submission_id: string | null
  submitted_at: string | null
  graded_at: string | null
  score: number | null
  feedback: string | null
  text_answer: string | null
  attachment_urls: string[] | null
  student_name: string
  student_code: string
}

interface GradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: HomeworkWithSubmission
  onGradeComplete: () => void
}

const gradeSchema = z.object({
  score: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const num = parseFloat(val)
        return !isNaN(num) && num >= 0 && num <= 100
      },
      { message: '0-100 사이의 숫자를 입력하세요' }
    ),
  feedback: z.string().optional(),
})

type GradeFormData = z.infer<typeof gradeSchema>

export function GradeDialog({
  open,
  onOpenChange,
  submission,
  onGradeComplete,
}: GradeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      score: submission.score?.toString() || '',
      feedback: submission.feedback || '',
    },
  })

  async function onSubmit(data: GradeFormData) {
    if (!submission.submission_id) {
      toast({
        title: '오류',
        description: '제출 정보를 찾을 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await gradeHomework({
        submissionId: submission.submission_id,
        score: data.score && data.score.trim() ? parseFloat(data.score) : undefined,
        feedback: data.feedback?.trim() || undefined,
      })

      if (result.success) {
        toast({
          title: '채점 완료',
          description: '숙제가 채점되었습니다.',
        })
        reset()
        onGradeComplete()
      } else {
        toast({
          title: '채점 오류',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '채점 오류',
        description: '채점 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            숙제 채점
          </DialogTitle>
          <DialogDescription>학생의 제출물을 확인하고 점수와 피드백을 입력하세요</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Submission Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{submission.title}</h3>
                  {submission.subject && (
                    <Badge variant="outline">{submission.subject}</Badge>
                  )}
                </div>
                {submission.graded_at && (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    채점 완료
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{submission.student_name}</p>
                    <p className="text-xs text-muted-foreground">{submission.student_code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">마감일</p>
                    <p className="font-medium">
                      {new Date(submission.due_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>

              {submission.submitted_at && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">제출일시</p>
                  <p className="font-medium">
                    {new Date(submission.submitted_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Content */}
          {(submission.text_answer || submission.attachment_urls) && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  제출 내용
                </h4>

                {submission.text_answer && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">텍스트 답안</Label>
                    <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                      {submission.text_answer}
                    </div>
                  </div>
                )}

                {submission.attachment_urls && submission.attachment_urls.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      첨부 파일 ({submission.attachment_urls.length})
                    </Label>
                    <div className="space-y-1">
                      {submission.attachment_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md text-sm text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Paperclip className="h-3 w-3" />
                          첨부파일 {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grading Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="score">
                점수 <span className="text-xs text-muted-foreground">(0-100, 선택사항)</span>
              </Label>
              <Input
                id="score"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="예: 85"
                {...register('score')}
                disabled={isSubmitting}
              />
              {errors.score && (
                <p className="text-sm text-destructive">{errors.score.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">
                피드백 <span className="text-xs text-muted-foreground">(선택사항)</span>
              </Label>
              <Textarea
                id="feedback"
                rows={4}
                placeholder="학생에게 전달할 피드백을 입력하세요..."
                {...register('feedback')}
                disabled={isSubmitting}
              />
              {errors.feedback && (
                <p className="text-sm text-destructive">{errors.feedback.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submission.graded_at ? '재채점' : '채점 완료'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
