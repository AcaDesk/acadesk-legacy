'use client'

import { Label } from '@ui/label'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import type { SendOptions } from '@/core/types/batch.types'

interface SendOptionsFormProps {
  value: SendOptions
  onChange: (value: SendOptions) => void
}

export function SendOptionsForm({ value, onChange }: SendOptionsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">전송 채널</Label>
        <Select
          value={value.channel || 'sms'}
          onValueChange={(v) => onChange({ ...value, channel: v as SendOptions['channel'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS (단문)</SelectItem>
            <SelectItem value="lms">LMS (장문)</SelectItem>
            <SelectItem value="kakao">카카오 알림톡</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(value.channel === 'lms' || value.channel === 'kakao') && (
        <div>
          <Label className="text-sm font-medium mb-1.5 block">제목</Label>
          <Input
            value={value.subject ?? ''}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            placeholder="메시지 제목"
          />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-1.5 block">메시지 본문</Label>
        <Textarea
          value={value.messageBody ?? ''}
          onChange={(e) => onChange({ ...value, messageBody: e.target.value })}
          placeholder="메시지 본문을 입력하세요. {학생명}, {리포트링크} 등의 변수를 사용할 수 있습니다."
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">
          사용 가능한 변수: {'{학생명}'}, {'{학원명}'}, {'{리포트링크}'}
        </p>
      </div>
    </div>
  )
}
