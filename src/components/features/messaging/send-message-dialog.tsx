'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Textarea } from '@ui/textarea'
import { Badge } from '@ui/badge'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Label } from '@ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Send, MessageSquare, Smartphone, Info, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@ui/card'
import { getMessageTemplates } from '@/app/actions/messages'

interface Recipient {
  id: string
  name: string
  phone: string
  studentName?: string
}

interface MessageTemplate {
  id: string
  name: string
  content: string
  category: string
  type: 'sms'
  created_at: string
  updated_at: string
}

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: Recipient[]
  defaultTemplate?: string
  context?: Record<string, string> // 변수 자동 치환용 (예: { 학생이름: '김철수', 금액: '250000' })
  onSuccess?: () => void
}

// Extract variables from template content
function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

// Custom template for manual input
const CUSTOM_TEMPLATE: MessageTemplate = {
  id: 'custom',
  name: '✏️ 직접 입력 (수동 작성)',
  category: 'custom',
  content: '',
  type: 'sms',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function SendMessageDialog({
  open,
  onOpenChange,
  recipients,
  defaultTemplate,
  context = {},
  onSuccess,
}: SendMessageDialogProps) {
  const { toast } = useToast()
  const [channel, setChannel] = useState<'alimtalk' | 'sms'>('alimtalk')
  const [templates, setTemplates] = useState<MessageTemplate[]>([CUSTOM_TEMPLATE])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultTemplate || 'custom'
  )
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load templates from database when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  async function loadTemplates() {
    setLoading(true)
    try {
      const result = await getMessageTemplates()
      if (result.success && result.data) {
        // Add custom template at the beginning
        setTemplates([CUSTOM_TEMPLATE, ...result.data])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast({
        title: '템플릿 로드 실패',
        description: '템플릿을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 템플릿 변경 시 내용 자동 업데이트
  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      let content = template.content

      // 변수 자동 치환 (context에 있는 값으로)
      const variables = extractVariables(template.content)
      variables.forEach(variable => {
        if (context[variable]) {
          content = content.replace(new RegExp(`\\{${variable}\\}`, 'g'), context[variable])
        }
      })

      setMessageContent(content)
    }
  }

  // 초기 템플릿 설정
  useEffect(() => {
    if (templates.length > 0) {
      handleTemplateChange(selectedTemplateId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, selectedTemplateId])

  async function handleSend() {
    if (!messageContent.trim()) {
      toast({
        title: '메시지 입력 필요',
        description: '메시지 내용을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)

    try {
      // TODO: 실제 메시지 발송 API 호출
      await new Promise(resolve => setTimeout(resolve, 1500))

      toast({
        title: '전송 완료',
        description: `${recipients.length}명에게 ${channel === 'alimtalk' ? '알림톡' : 'SMS'}이 발송되었습니다.`,
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '전송 실패',
        description: '메시지 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  const selectedVariables = selectedTemplate ? extractVariables(selectedTemplate.content) : []
  const estimatedCost = channel === 'alimtalk' ? recipients.length * 8 : recipients.length * 15

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            메시지 전송
          </DialogTitle>
          <DialogDescription>
            학부모님께 알림을 전송합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 수신인 정보 */}
          <div className="space-y-2">
            <Label>수신인</Label>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {recipients.length}명
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {recipients.length === 1
                        ? recipients[0].name
                        : `${recipients[0].name} 외 ${recipients.length - 1}명`}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    예상 비용: 약 {estimatedCost}원
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 발송 채널 선택 */}
          <div className="space-y-2">
            <Label>발송 채널</Label>
            <RadioGroup value={channel} onValueChange={(value: any) => setChannel(value)}>
              <div className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="alimtalk"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    channel === 'alimtalk'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value="alimtalk" id="alimtalk" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">알림톡</span>
                      <Badge variant="default" className="ml-auto">추천</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      도달률 높음 • 약 8원/건
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="sms"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    channel === 'sms'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value="sms" id="sms" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="font-medium">SMS</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      전통적 방식 • 약 15원/건
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 템플릿 선택 */}
          <div className="space-y-2">
            <Label>템플릿 선택</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "템플릿 로딩 중..." : "템플릿 선택"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => {
                  const variables = extractVariables(template.content)
                  return (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {variables.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({variables.join(', ')})
                        </span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 메시지 내용 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>메시지 내용</Label>
              {selectedTemplate && selectedTemplate.id === 'custom' && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Info className="h-3 w-3" />
                  <span>직접 작성 모드 - 자유롭게 입력하세요</span>
                </div>
              )}
              {selectedTemplate && selectedVariables.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>변수가 자동으로 변환됩니다</span>
                </div>
              )}
            </div>
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder={
                selectedTemplate?.id === 'custom'
                  ? "학부모님께 전달할 메시지를 자유롭게 작성하세요.\n\n예:\n철수 어머님, 안녕하세요.\n이번 주 보강 일정 관련해서..."
                  : "메시지 내용을 입력하세요..."
              }
              className="min-h-[200px] font-mono text-sm"
              disabled={sending}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{messageContent.length}자</span>
              {channel === 'sms' && messageContent.length > 90 && (
                <span className="text-orange-600">
                  장문 SMS ({Math.ceil(messageContent.length / 90)}건으로 발송)
                </span>
              )}
            </div>
          </div>

          {/* 안내 사항 */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium">발송 전 확인사항</p>
                  <ul className="list-disc list-inside text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>알림톡 실패 시 자동으로 SMS로 재발송됩니다</li>
                    <li>발송 후 취소가 불가능하니 내용을 확인해주세요</li>
                    <li>광고성 메시지는 수신 동의자에게만 발송 가능합니다</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending || !messageContent.trim()}>
            {sending ? (
              <>전송 중...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {recipients.length}명에게 전송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
