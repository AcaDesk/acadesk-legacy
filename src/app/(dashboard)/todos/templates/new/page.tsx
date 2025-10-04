'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ArrowLeft, Repeat, Calendar, Clock } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/constants'

export default function NewTodoTemplatePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [priority, setPriority] = useState('normal')
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const templateData: any = {
        tenant_id: currentUser.tenantId,
        title,
        description: description || null,
        subject: subject || null,
        day_of_week: dayOfWeek ? parseInt(dayOfWeek) : null,
        estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration) : null,
        priority,
        active: true,
      }

      const { error } = await supabase.from('todo_templates').insert(templateData)

      if (error) throw error

      toast({
        title: '템플릿 등록 완료',
        description: `${title} 템플릿이 등록되었습니다.`,
      })

      router.push('/todos/templates')
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast({
        title: '등록 오류',
        description: error.message || '템플릿을 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/todos/templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">과제 템플릿 등록</h1>
            <p className="text-muted-foreground">반복적으로 배정할 과제 템플릿을 등록합니다</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-600" />
              <CardTitle>템플릿 정보</CardTitle>
            </div>
            <CardDescription>
              템플릿을 기반으로 주기적으로 과제를 자동 배정할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">과제명 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 주간 단어 암기"
                  required
                />
              </div>

              {/* Subject and Priority */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">과목</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예: 영어, 수학"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="normal">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Day of Week and Duration */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      마감 요일
                    </div>
                  </Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue placeholder="요일 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">선택 안 함</SelectItem>
                      {Object.entries(DAYS_OF_WEEK).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}요일
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    과제를 자동 생성할 때 마감 요일로 사용됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      예상 소요 시간 (분)
                    </div>
                  </Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    min="1"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="예: 30"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">과제 설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="과제에 대한 상세한 설명을 입력하세요..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Examples */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-sm mb-2">💡 사용 예시</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>주간 단어 암기</strong>: 매주 금요일 마감, 영어 과목</li>
                    <li>• <strong>교재 진도 예습</strong>: 매주 일요일 마감, 30분 소요</li>
                    <li>• <strong>오답 노트 정리</strong>: 높은 우선순위, 수학 과목</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/todos/templates')}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? '등록 중...' : '템플릿 등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
