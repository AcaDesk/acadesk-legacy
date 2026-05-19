'use client'

import { useEffect, useState } from 'react'
import { Button } from '@ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Label } from '@ui/label'
import { PhoneInput } from '@ui/phone-input'
import { Alert, AlertDescription } from '@ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Info, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { sendTestEventNotification } from '@/app/actions/messaging/event-subscriptions'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'
import { resolveEventDisplay } from './event-display'

interface EventSubscriptionTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptions: EventSubscription[]
  initialEventType?: string | null
}

export function EventSubscriptionTestDialog({
  open,
  onOpenChange,
  subscriptions,
  initialEventType,
}: EventSubscriptionTestDialogProps) {
  const { toast } = useToast()
  const approved = subscriptions.filter((s) => s.provisioningStatus === 'approved')
  const [eventType, setEventType] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initialEventType && approved.some((s) => s.eventType === initialEventType)) {
      setEventType(initialEventType)
    } else if (approved.length > 0) {
      setEventType((prev) => prev || approved[0].eventType)
    } else {
      setEventType('')
    }
    // 전화번호는 마지막 입력값을 유지 — 같은 대상으로 여러 이벤트 테스트 발송하는 흐름을 단순화
  }, [open, initialEventType, approved])

  async function handleSend() {
    if (!eventType) {
      toast({ variant: 'destructive', title: '이벤트를 선택해주세요.' })
      return
    }
    if (!phone.trim()) {
      toast({ variant: 'destructive', title: '수신 번호를 입력해주세요.' })
      return
    }
    setSending(true)
    try {
      const result = await sendTestEventNotification(eventType, phone)
      if (!result.success) {
        toast({ variant: 'destructive', title: '테스트 발송 실패', description: result.error || '' })
        return
      }
      toast({ title: '테스트 발송 완료', description: '입력한 번호로 알림톡이 발송되었습니다.' })
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error instanceof Error ? error.message : '',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>알림 발송 테스트</DialogTitle>
          <DialogDescription>
            입력한 번호로 선택한 이벤트 알림톡을 즉시 발송합니다. 더미 변수 값으로 채워집니다.
          </DialogDescription>
        </DialogHeader>

        {approved.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              테스트 발송 가능한 이벤트가 없습니다. 먼저 템플릿을 등록하고 카카오 검수가 완료되어야 합니다.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-event-type">이벤트</Label>
              <Select value={eventType} onValueChange={setEventType} disabled={sending}>
                <SelectTrigger id="test-event-type" className="mt-2">
                  <SelectValue placeholder="이벤트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {approved.map((sub) => {
                    const display = resolveEventDisplay(sub.eventType, sub.sharedTemplate)
                    return (
                      <SelectItem key={sub.eventType} value={sub.eventType}>
                        <span className="mr-2">{display.icon}</span>
                        {display.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="test-event-phone">수신 번호</Label>
              <PhoneInput
                id="test-event-phone"
                value={phone}
                onChange={setPhone}
                placeholder="010-0000-0000"
                className="mt-2"
                disabled={sending}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                실제 알림톡 발송이 이루어지며 발송 비용이 차감됩니다.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending || approved.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? '발송 중...' : '테스트 발송'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
