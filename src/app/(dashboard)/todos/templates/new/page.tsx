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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import {
  Repeat,
  Calendar,
  Clock,
  BookOpen,
  AlertCircle,
  Zap,
  CheckCircle2,
  Info,
  ChevronRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2
} from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/constants'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

const DURATION_PRESETS = [
  { label: '15분', value: 15 },
  { label: '30분', value: 30 },
  { label: '45분', value: 45 },
  { label: '60분', value: 60 },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: '높음', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  { value: 'normal', label: '보통', icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { value: 'low', label: '낮음', icon: Info, color: 'text-gray-600', bgColor: 'bg-gray-50' },
]

export default function NewTodoTemplatePage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.todoManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 템플릿 등록" description="반복적으로 배정할 과제를 템플릿으로 등록하고 자동으로 학생들에게 배정할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 템플릿 등록" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [priority, setPriority] = useState('normal')
  const [loading, setLoading] = useState(false)
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  // Markdown formatting functions
  const wrapSelection = (before: string, after: string) => {
    if (!textareaRef) return

    const start = textareaRef.selectionStart
    const end = textareaRef.selectionEnd
    const selectedText = description.substring(start, end)
    const beforeText = description.substring(0, start)
    const afterText = description.substring(end)

    const newText = beforeText + before + selectedText + after + afterText
    setDescription(newText)

    // Restore focus and selection
    setTimeout(() => {
      textareaRef.focus()
      textareaRef.selectionStart = start + before.length
      textareaRef.selectionEnd = end + before.length
    }, 0)
  }

  const insertAtCursor = (text: string) => {
    if (!textareaRef) return

    const start = textareaRef.selectionStart
    const end = textareaRef.selectionEnd
    const beforeText = description.substring(0, start)
    const afterText = description.substring(end)

    const newText = beforeText + text + afterText
    setDescription(newText)

    // Restore focus and set cursor position
    setTimeout(() => {
      textareaRef.focus()
      const newPosition = start + text.length
      textareaRef.selectionStart = newPosition
      textareaRef.selectionEnd = newPosition
    }, 0)
  }

  const handleBold = () => wrapSelection('**', '**')
  const handleItalic = () => wrapSelection('*', '*')
  const handleHeading = () => {
    if (!textareaRef) return
    const start = textareaRef.selectionStart
    const lineStart = description.lastIndexOf('\n', start - 1) + 1
    const beforeLine = description.substring(0, lineStart)
    const afterLine = description.substring(lineStart)
    setDescription(beforeLine + '## ' + afterLine)
    setTimeout(() => {
      textareaRef.focus()
      textareaRef.selectionStart = lineStart + 3
      textareaRef.selectionEnd = lineStart + 3
    }, 0)
  }
  const handleLink = () => {
    const url = prompt('링크 URL을 입력하세요:')
    if (url) {
      const start = textareaRef?.selectionStart || 0
      const end = textareaRef?.selectionEnd || 0
      const selectedText = description.substring(start, end)
      const linkText = selectedText || '링크 텍스트'
      wrapSelection('[', `](${url})`)
      if (!selectedText) {
        // If no text was selected, select the placeholder text
        setTimeout(() => {
          if (textareaRef) {
            textareaRef.selectionStart = start + 1
            textareaRef.selectionEnd = start + 1 + linkText.length
          }
        }, 0)
      }
    }
  }
  const handleList = () => insertAtCursor('\n- ')
  const handleOrderedList = () => insertAtCursor('\n1. ')

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

    if (!title.trim()) {
      toast({
        title: '입력 오류',
        description: '과제명을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const templateData: any = {
        tenant_id: currentUser.tenantId,
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
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

  const selectedPriority = PRIORITY_OPTIONS.find(opt => opt.value === priority)

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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/todos')}
            className="hover:text-foreground transition-colors"
          >
            TODO 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => router.push('/todos/templates')}
            className="hover:text-foreground transition-colors"
          >
            과제 템플릿
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">새 템플릿</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">과제 템플릿 등록</h1>
          <p className="text-muted-foreground mt-1">
            반복적으로 배정할 과제 템플릿을 등록하고 자동화하세요
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle>기본 정보</CardTitle>
                  </div>
                  <CardDescription>
                    과제의 핵심 정보를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      과제명
                      <Badge variant="destructive" className="text-xs">필수</Badge>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 주간 단어 암기, 교재 진도 예습"
                      required
                      className="text-base"
                    />
                  </div>

                  <Separator />

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      과목
                      <Badge variant="outline" className="text-xs">선택</Badge>
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="예: 영어, 수학, 과학"
                      className="text-base"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      과제 설명
                      <Badge variant="outline" className="text-xs">선택</Badge>
                      <Badge variant="secondary" className="text-xs">서식 버튼 사용 가능</Badge>
                    </Label>

                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleBold}
                        className="h-8 px-2"
                        title="굵게 (Ctrl+B)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleItalic}
                        className="h-8 px-2"
                        title="기울임 (Ctrl+I)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleHeading}
                        className="h-8 px-2"
                        title="제목"
                      >
                        <Heading2 className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-8 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLink}
                        className="h-8 px-2"
                        title="링크 추가"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleList}
                        className="h-8 px-2"
                        title="목록"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleOrderedList}
                        className="h-8 px-2"
                        title="번호 목록"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>

                    <Textarea
                      ref={setTextareaRef}
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={`과제 목표를 작성하세요...

위 버튼을 사용하거나 직접 마크다운 문법을 입력할 수 있습니다.
예: **굵게**, *기울임*, [링크 텍스트](URL)`}
                      rows={10}
                      className="resize-none text-base font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 텍스트를 선택하고 위 버튼을 클릭하여 서식을 적용하세요. 오른쪽 미리보기에서 결과를 확인할 수 있습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule & Priority */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    <CardTitle>일정 및 우선순위</CardTitle>
                  </div>
                  <CardDescription>
                    과제의 마감일과 중요도를 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Priority */}
                  <div className="space-y-3">
                    <Label htmlFor="priority">우선순위</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {PRIORITY_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isSelected = priority === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPriority(option.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? `${option.bgColor} border-current ${option.color}`
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                          >
                            <Icon className={`h-6 w-6 ${isSelected ? option.color : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${isSelected ? option.color : 'text-foreground'}`}>
                              {option.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Day of Week */}
                  <div className="space-y-2">
                    <Label htmlFor="dayOfWeek" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      마감 요일
                      <Badge variant="outline" className="text-xs">선택</Badge>
                    </Label>
                    <Select value={dayOfWeek || undefined} onValueChange={(value) => setDayOfWeek(value === 'none' ? '' : value)}>
                      <SelectTrigger id="dayOfWeek">
                        <SelectValue placeholder="요일을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안 함</SelectItem>
                        {Object.entries(DAYS_OF_WEEK).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}요일
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      과제를 자동 생성할 때 다음 해당 요일로 마감일이 설정됩니다
                    </p>
                  </div>

                  <Separator />

                  {/* Duration */}
                  <div className="space-y-3">
                    <Label htmlFor="estimatedDuration" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      예상 소요 시간 (분)
                      <Badge variant="outline" className="text-xs">선택</Badge>
                    </Label>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2">
                      {DURATION_PRESETS.map((preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={estimatedDuration === preset.value.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEstimatedDuration(preset.value.toString())}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* Custom input */}
                    <Input
                      id="estimatedDuration"
                      type="number"
                      min="1"
                      max="300"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      placeholder="직접 입력 (예: 20)"
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      학생들의 학습 계획 수립에 도움이 됩니다
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/todos/templates')}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !title.trim()}
                >
                  {loading ? (
                    <>
                      <Repeat className="h-4 w-4 mr-2 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      템플릿 등록
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview & Tips */}
          <div className="space-y-6">
            {/* Preview Card */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">미리보기</CardTitle>
                <CardDescription>입력한 내용이 어떻게 표시되는지 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base line-clamp-2">
                      {title || '과제명을 입력하세요'}
                    </h3>
                    {selectedPriority && (
                      <Badge
                        variant={priority === 'high' ? 'destructive' : priority === 'normal' ? 'secondary' : 'outline'}
                        className="shrink-0"
                      >
                        {selectedPriority.label}
                      </Badge>
                    )}
                  </div>

                  {subject && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{subject}</span>
                    </div>
                  )}

                  {dayOfWeek && dayOfWeek !== 'none' && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        매주 {DAYS_OF_WEEK[parseInt(dayOfWeek)]}요일 마감
                      </span>
                    </div>
                  )}

                  {estimatedDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        약 {estimatedDuration}분 소요
                      </span>
                    </div>
                  )}

                  {description && (
                    <div className="pt-2 border-t">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {!title && !description && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      정보를 입력하면 여기에 미리보기가 표시됩니다
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  활용 팁
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>주간 과제</strong>로 매주 반복되는 학습 활동을 자동화하세요</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>예상 시간</strong>을 설정하면 학생들이 계획을 세우기 쉬워집니다</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>우선순위</strong>로 중요한 과제를 강조할 수 있습니다</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>템플릿 목록에서 <strong>일괄 생성</strong> 버튼으로 모든 학생에게 한번에 배정하세요</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💡 예시</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex flex-col gap-1">
                    <strong className="text-foreground">주간 단어 암기</strong>
                    <span className="text-xs">금요일 마감, 영어, 30분, 높음</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <strong className="text-foreground">교재 진도 예습</strong>
                    <span className="text-xs">일요일 마감, 수학, 45분, 보통</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <strong className="text-foreground">오답 노트 정리</strong>
                    <span className="text-xs">과목별, 20분, 높음</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
