'use client'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, Send, Loader2, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function FeedbackPage() {
  const [category, setCategory] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category || !subject || !feedback) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: 실제 API 엔드포인트로 피드백 전송
      const feedbackData = {
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || '',
        category,
        subject,
        feedback,
        timestamp: new Date().toISOString(),
      }

      console.log('피드백:', feedbackData)

      // 성공 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: '피드백이 전송되었습니다',
        description: '소중한 의견 감사합니다!',
      })

      // 폼 초기화
      setCategory('')
      setSubject('')
      setFeedback('')
    } catch (error) {
      toast({
        title: '피드백 전송 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper
      title="피드백 보내기"
      subtitle="Acadesk 개선을 위한 여러분의 의견을 들려주세요"
      icon={<MessageSquare className="w-6 h-6" />}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* 피드백 폼 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>의견 보내기</CardTitle>
              <CardDescription>
                개선 사항, 새로운 기능 제안, 사용 경험 등 무엇이든 알려주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 카테고리 */}
                <div className="space-y-2">
                  <Label htmlFor="category">피드백 유형 *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">새 기능 제안</SelectItem>
                      <SelectItem value="improvement">개선 사항</SelectItem>
                      <SelectItem value="experience">사용 경험</SelectItem>
                      <SelectItem value="compliment">칭찬</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 제목 */}
                <div className="space-y-2">
                  <Label htmlFor="subject">제목 *</Label>
                  <Input
                    id="subject"
                    placeholder="피드백 제목을 입력하세요"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* 내용 */}
                <div className="space-y-2">
                  <Label htmlFor="feedback">내용 *</Label>
                  <Textarea
                    id="feedback"
                    placeholder="자유롭게 의견을 작성해주세요. 구체적일수록 더 좋습니다!"
                    rows={10}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    최소 10자 이상 작성해주세요
                  </p>
                </div>

                {/* 사용자 정보 */}
                {currentUser && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    <p>답변이 필요한 경우: {currentUser.email}</p>
                  </div>
                )}

                {/* 제출 버튼 */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || feedback.length < 10}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        전송 중...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        피드백 보내기
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 안내 사이드바 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                피드백 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">구체적으로 작성해주세요</h4>
                <p className="text-muted-foreground text-xs">
                  어떤 상황에서 어떤 기능이 필요한지, 현재 어떤 불편함이 있는지 자세히 알려주시면 더 좋은 개선이 가능합니다.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">스크린샷 첨부</h4>
                <p className="text-muted-foreground text-xs">
                  이메일로 피드백을 보내실 때는 스크린샷을 첨부하시면 이해가 빠릅니다.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">답변 기간</h4>
                <p className="text-muted-foreground text-xs">
                  모든 피드백을 검토하며, 답변이 필요한 경우 3-5일 내에 회신드립니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">다른 지원 방법</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a href="/help/guide" className="block text-primary hover:underline">
                → 사용 가이드
              </a>
              <a href="/help/faq" className="block text-primary hover:underline">
                → 자주 묻는 질문
              </a>
              <a href="/help/inquiries" className="block text-primary hover:underline">
                → 1:1 문의하기
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
