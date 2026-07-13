'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { sendDirectMessages } from '@/app/actions/messaging/messages'
import { useMessageTemplatesQuery } from '@/hooks/queries/use-messaging-query'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import { extractKakaoVariableNames, renderKakaoTemplatePreview } from '@/lib/kakao/kakao-variables'
import { getErrorMessage } from '@/lib/error-handlers'

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
  const [channel, setChannel] = useState<'kakao' | 'sms'>('sms')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultTemplate || 'custom'
  )
  const [messageContent, setMessageContent] = useState('')
  const {
    hasKakaoChannel,
    isCheckingChannel,
    templates: kakaoTemplates,
    isLoadingTemplates,
    checkChannel,
    loadTemplates: loadKakaoTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  const templatesQuery = useMessageTemplatesQuery(open)
  // 직접 입력 항목을 항상 첫 번째로 노출
  const templates: MessageTemplate[] = useMemo(
    () => [CUSTOM_TEMPLATE, ...((templatesQuery.data ?? []) as MessageTemplate[])],
    [templatesQuery.data]
  )
  const loading = open && templatesQuery.isPending

  useEffect(() => {
    if (open) {
      checkChannel()
    }
  }, [open, checkChannel])

  useEffect(() => {
    if (open && channel === 'kakao' && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadKakaoTemplates()
    }
  }, [open, channel, hasKakaoChannel, kakaoTemplates.length, loadKakaoTemplates])

  // 템플릿 변경 시 내용 자동 업데이트
  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId)
    if (channel === 'kakao') {
      const template = kakaoTemplates.find(t => t.id === templateId)
      setMessageContent(template?.content || '')
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (template) {
      let content = template.content

      const variables = extractVariables(template.content)
      variables.forEach(variable => {
        if (context[variable]) {
          content = content.replace(new RegExp(`\\{${variable}\\}`, 'g'), context[variable])
        }
      })

      setMessageContent(content)
    }
  }, [channel, kakaoTemplates, templates, context])

  // 초기 템플릿 설정
  useEffect(() => {
    if (channel === 'sms' && templates.length > 0) {
      handleTemplateChange(selectedTemplateId)
    }
  }, [channel, handleTemplateChange, templates, selectedTemplateId])

  const sendMutation = useMutation({
    mutationFn: async () => {
      const result = await sendDirectMessages({
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          phone: recipient.phone,
          studentName: recipient.studentName,
        })),
        type: channel,
        message: messageContent,
        context,
        ...(channel === 'kakao' && { kakaoTemplateId: selectedTemplateId }),
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 전송 실패')
      }
      return result.data
    },
    onSuccess: (data) => {
      toast({
        title: '전송 완료',
        description: `${data.successCount}건 성공, ${data.failCount}건 실패`,
      })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast({
        title: '전송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
  const sending = sendMutation.isPending

  function handleSend() {
    if (channel === 'kakao' && !selectedTemplateId) {
      toast({
        title: '템플릿 선택 필요',
        description: '알림톡은 승인된 템플릿을 선택해야 합니다.',
        variant: 'destructive',
      })
      return
    }

    if (channel === 'sms' && !messageContent.trim()) {
      toast({
        title: '메시지 입력 필요',
        description: '메시지 내용을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    sendMutation.mutate()
  }

  const selectedTemplate = channel === 'kakao'
    ? kakaoTemplates.find(t => t.id === selectedTemplateId)
    : templates.find(t => t.id === selectedTemplateId)
  const selectedVariables = selectedTemplate
    ? channel === 'kakao'
      ? extractKakaoVariableNames(selectedTemplate.content)
      : extractVariables(selectedTemplate.content)
    : []
  const estimatedCost = channel === 'kakao' ? recipients.length * 8 : recipients.length * 15
  const templateOptions = channel === 'kakao' ? kakaoTemplates : templates
  const templateLoading = channel === 'kakao' ? isLoadingTemplates || isCheckingChannel : loading

  function handleChannelChange(value: 'kakao' | 'sms') {
    setChannel(value)
    setSelectedTemplateId(value === 'sms' ? 'custom' : '')
    setMessageContent('')

    if (value === 'kakao' && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadKakaoTemplates()
    }
  }

  const kakaoPreview = useMemo(() => {
    if (!messageContent) return ''
    const firstRecipient = recipients[0]
    return renderKakaoTemplatePreview(messageContent, {
      학원명: context.학원명 || '',
      보호자명: firstRecipient?.name || '보호자',
      학생명: firstRecipient?.studentName || context.학생명 || context.학생이름 || '학생',
      ...context,
    })
  }, [messageContent, recipients, context])

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
            <RadioGroup
              value={channel}
              onValueChange={(value) => handleChannelChange(value as 'kakao' | 'sms')}
            >
              <div className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="kakao"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    channel === 'kakao'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value="kakao" id="kakao" disabled={!hasKakaoChannel && !isCheckingChannel} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">알림톡</span>
                      {hasKakaoChannel ? (
                        <Badge variant="default" className="ml-auto">추천</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-auto">채널 필요</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      승인 템플릿 기반 • 약 8원/건
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
            <Select
              value={selectedTemplateId}
              onValueChange={handleTemplateChange}
              disabled={templateLoading || (channel === 'kakao' && !hasKakaoChannel)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    templateLoading
                      ? '템플릿 로딩 중...'
                      : channel === 'kakao'
                        ? '승인된 알림톡 템플릿 선택'
                        : '템플릿 선택'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {channel === 'kakao' ? '승인된 템플릿이 없습니다' : '템플릿이 없습니다'}
                  </SelectItem>
                ) : templateOptions.map((template) => {
                  const variables = channel === 'kakao'
                    ? extractKakaoVariableNames(template.content)
                    : extractVariables(template.content)
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
                <div className="flex items-center gap-1 text-xs text-info">
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
              readOnly={channel === 'kakao'}
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
            {channel === 'kakao' && kakaoPreview && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {kakaoPreview}
              </div>
            )}
          </div>

          {/* 안내 사항 */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm text-foreground">
                  <p className="font-medium">발송 전 확인사항</p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                    <li>알림톡은 설정된 fallback 정책에 따라 실패 시 SMS로 대체될 수 있습니다</li>
                    <li>발송 후 취소가 불가능하니 내용을 확인해주세요</li>
                    <li>광고성 메시지는 알림톡 템플릿으로 발송할 수 없습니다</li>
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
          <Button
            onClick={handleSend}
            disabled={sending || (channel === 'kakao' ? !selectedTemplateId : !messageContent.trim())}
          >
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
