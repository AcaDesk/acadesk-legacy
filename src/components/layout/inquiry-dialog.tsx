'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'

interface InquiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InquiryDialog({ open, onOpenChange }: InquiryDialogProps) {
  const [category, setCategory] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category || !subject || !message) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // API로 문의 전송
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_type: 'inquiry',
          category,
          subject,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '문의 접수에 실패했습니다.')
      }

      toast({
        title: '문의가 접수되었습니다',
        description: '빠른 시일 내에 답변드리겠습니다.',
      })

      // 폼 초기화
      setCategory('')
      setSubject('')
      setMessage('')
      onOpenChange(false)
    } catch (error) {
      console.error('Inquiry submission error:', error)
      toast({
        title: '문의 전송 실패',
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>1:1 문의하기</DialogTitle>
          <DialogDescription>
            문의 내용을 남겨주시면 빠르게 답변드리겠습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-1 flex-1">
            {/* 문의 유형 */}
            <div className="space-y-2">
              <Label htmlFor="category">문의 유형 *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">기능 문의</SelectItem>
                  <SelectItem value="usage">사용법 문의</SelectItem>
                  <SelectItem value="billing">결제/청구 문의</SelectItem>
                  <SelectItem value="account">계정 문의</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="subject">제목 *</Label>
              <Input
                id="subject"
                placeholder="문의 제목을 입력하세요"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label htmlFor="message">문의 내용 *</Label>
              <Textarea
                id="message"
                placeholder="문의 내용을 자세히 입력해주세요"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 사용자 정보 */}
            {currentUser && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <p>답변 받으실 이메일: {currentUser.email}</p>
              </div>
            )}
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
                  문의하기
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
