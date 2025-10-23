'use client'

import { useState } from 'react'
import { Loader2, Send, AlertTriangle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'

interface BugReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const [severity, setSeverity] = useState<string>('')
  const [page, setPage] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!severity || !page || !description) {
      toast({
        title: '입력 오류',
        description: '필수 필드를 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // API로 버그 리포트 전송
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_type: 'bug_report',
          subject: `[버그] ${page}`,
          message: description,
          severity,
          page,
          steps_to_reproduce: steps,
          browser: navigator.userAgent,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '버그 리포트 전송에 실패했습니다.')
      }

      toast({
        title: '버그 리포트가 접수되었습니다',
        description: '신고해주셔서 감사합니다. 빠르게 확인하겠습니다.',
      })

      // 폼 초기화
      setSeverity('')
      setPage('')
      setDescription('')
      setSteps('')
      onOpenChange(false)
    } catch (error) {
      console.error('Bug report submission error:', error)
      toast({
        title: '리포트 전송 실패',
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            버그/오류 제보
          </DialogTitle>
          <DialogDescription>
            발견하신 버그나 오류를 상세히 알려주세요. 빠르게 수정하겠습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-1 flex-1">
            {/* 심각도 */}
            <div className="space-y-2">
              <Label htmlFor="severity">심각도 *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder="심각도를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">심각 - 시스템 사용 불가</SelectItem>
                  <SelectItem value="high">높음 - 주요 기능 오작동</SelectItem>
                  <SelectItem value="medium">보통 - 일부 기능 문제</SelectItem>
                  <SelectItem value="low">낮음 - 사소한 불편</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 발생 페이지 */}
            <div className="space-y-2">
              <Label htmlFor="page">발생 페이지/기능 *</Label>
              <Input
                id="page"
                placeholder="예: 학생 관리 > 출석 체크"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 버그 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">버그 설명 *</Label>
              <Textarea
                id="description"
                placeholder="어떤 문제가 발생했는지 자세히 설명해주세요"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 재현 방법 */}
            <div className="space-y-2">
              <Label htmlFor="steps">재현 방법 (선택)</Label>
              <Textarea
                id="steps"
                placeholder="1. 학생 관리 페이지 접속&#10;2. 새 학생 추가 클릭&#10;3. 저장 버튼 클릭&#10;4. 오류 발생"
                rows={3}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 브라우저 정보 */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">자동 수집 정보:</p>
              <p className="truncate">{navigator.userAgent}</p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  제보하기
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
