'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Alert, AlertDescription } from '@ui/alert'
import { Send, MessageSquare, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { sendMessages, getMessageTemplates } from '@/app/actions/messages'
import { getErrorMessage } from '@/lib/error-handlers'
import { StudentSearch } from '@/components/features/students/student-search'

interface MessageTemplate {
  id: string
  name: string
  content: string
  type: 'sms'
  category: string
}

interface BulkMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMessageSent?: () => void
}

type MessageType = 'sms' | 'lms' | 'mms'

const MESSAGE_TYPE_INFO = {
  sms: {
    label: 'SMS (단문)',
    description: '90바이트(한글 45자) 이내의 짧은 문자',
    maxLength: 90,
    maxLengthKor: 45,
    estimatedCost: '약 8-10원/건',
    icon: '📱',
  },
  lms: {
    label: 'LMS (장문)',
    description: '2,000자 이내의 긴 문자 메시지',
    maxLength: 2000,
    maxLengthKor: 1000,
    estimatedCost: '약 24-30원/건',
    icon: '📄',
  },
  mms: {
    label: 'MMS (포토)',
    description: '2,000자 + 이미지 첨부 가능 (이미지 업로드는 추후 지원)',
    maxLength: 2000,
    maxLengthKor: 1000,
    estimatedCost: '약 40-50원/건',
    icon: '🖼️',
  },
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  onMessageSent,
}: BulkMessageDialogProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('sms')
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [sending, setSending] = useState(false)

  const { toast } = useToast()
  const typeInfo = MESSAGE_TYPE_INFO[messageType]

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadTemplates() {
    try {
      const result = await getMessageTemplates()
      if (result.success && result.data) {
        // SMS 템플릿만 필터링
        setTemplates(result.data.filter(t => t.type === 'sms'))
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  function useTemplate(template: MessageTemplate) {
    setMessage(template.content)
  }

  async function handleSend() {
    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '메시지를 받을 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: '메시지 내용 필요',
        description: '전송할 메시지를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // 글자 수 제한 체크
    const charCount = message.length
    if (messageType === 'sms' && charCount > typeInfo.maxLengthKor) {
      toast({
        title: '글자 수 초과',
        description: `SMS는 최대 ${typeInfo.maxLengthKor}자까지 입력 가능합니다. LMS 또는 MMS를 선택해주세요.`,
        variant: 'destructive',
      })
      return
    }

    if ((messageType === 'lms' || messageType === 'mms') && charCount > typeInfo.maxLengthKor) {
      toast({
        title: '글자 수 초과',
        description: `최대 ${typeInfo.maxLengthKor}자까지 입력 가능합니다.`,
        variant: 'destructive',
      })
      return
    }

    setSending(true)

    try {
      const result = await sendMessages({
        studentIds: selectedStudents,
        message: message.trim(),
        type: messageType,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 전송 실패')
      }

      toast({
        title: '메시지 전송 완료',
        description: `${result.data.successCount}건 성공, ${result.data.failCount}건 실패`,
      })

      // Reset form
      setSelectedStudents([])
      setMessage('')
      setMessageType('sms')
      onMessageSent?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending messages:', error)
      toast({
        title: '전송 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일괄 메시지 전송</DialogTitle>
          <DialogDescription>
            학생 보호자에게 SMS/알림톡을 일괄 전송합니다
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Student Selection */}
          <div className="space-y-4">
            <Label>수신 대상 선택</Label>
            <StudentSearch
              mode="multiple"
              variant="checkbox-list"
              value={selectedStudents}
              onChange={setSelectedStudents}
              searchable={true}
              showSelectAll={true}
              showSelectedCount={true}
              placeholder="학생 검색..."
              className="border rounded-lg"
            />
          </div>

          {/* Right: Message Composition */}
          <div className="space-y-4">
            <div>
              <Label>메시지 타입</Label>
              <Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <span>{MESSAGE_TYPE_INFO.sms.icon}</span>
                      <div>
                        <p className="font-medium">{MESSAGE_TYPE_INFO.sms.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {MESSAGE_TYPE_INFO.sms.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="lms">
                    <div className="flex items-center gap-2">
                      <span>{MESSAGE_TYPE_INFO.lms.icon}</span>
                      <div>
                        <p className="font-medium">{MESSAGE_TYPE_INFO.lms.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {MESSAGE_TYPE_INFO.lms.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="mms">
                    <div className="flex items-center gap-2">
                      <span>{MESSAGE_TYPE_INFO.mms.icon}</span>
                      <div>
                        <p className="font-medium">{MESSAGE_TYPE_INFO.mms.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {MESSAGE_TYPE_INFO.mms.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Type Info Alert */}
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm font-medium">{typeInfo.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    최대 {typeInfo.maxLengthKor}자 | 예상 비용: {typeInfo.estimatedCost}
                  </p>
                </AlertDescription>
              </Alert>
            </div>

            {templates.length > 0 && (
              <div>
                <Label>템플릿 사용</Label>
                <div className="mt-2 space-y-2">
                  {templates.slice(0, 3).map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => useTemplate(template)}
                    >
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {template.content.substring(0, 50)}...
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="message">메시지 내용</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`${typeInfo.label} 메시지 내용을 입력하세요 (최대 ${typeInfo.maxLengthKor}자)`}
                rows={messageType === 'sms' ? 4 : 8}
                className="mt-2"
                maxLength={typeInfo.maxLengthKor}
              />
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${
                  message.length > typeInfo.maxLengthKor * 0.9
                    ? 'text-orange-600 font-medium'
                    : 'text-muted-foreground'
                }`}>
                  {message.length} / {typeInfo.maxLengthKor}자
                </p>
                {messageType === 'sms' && message.length > typeInfo.maxLengthKor && (
                  <p className="text-xs text-red-600 font-medium">
                    SMS 글자 수 초과 - LMS 또는 MMS 선택 필요
                  </p>
                )}
              </div>

              {/* 비용 안내 */}
              <p className="text-xs text-muted-foreground mt-2">
                💡 {selectedStudents.length}명에게 발송 시 예상 비용: 약 {
                  Math.ceil(
                    selectedStudents.length *
                    parseInt(typeInfo.estimatedCost.match(/\d+/)?.[0] || '10')
                  )
                }원
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending || selectedStudents.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? '전송 중...' : `${selectedStudents.length}명에게 전송`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
