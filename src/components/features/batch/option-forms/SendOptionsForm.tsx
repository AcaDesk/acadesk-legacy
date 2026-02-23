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
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const defaultWeekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  const defaultWeekEnd = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">대상 리포트</Label>
        <Select
          value={value.targetReportMode ?? 'latest'}
          onValueChange={(mode) =>
            onChange({
              ...value,
              targetReportMode: mode as SendOptions['targetReportMode'],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">가장 최근 리포트</SelectItem>
            <SelectItem value="monthly">월간 리포트 지정</SelectItem>
            <SelectItem value="weekly">주간 리포트 지정</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.targetReportMode === 'monthly' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">연도</Label>
            <Input
              type="number"
              value={value.reportYear ?? currentYear}
              min={2020}
              max={2035}
              onChange={(e) => onChange({ ...value, reportYear: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">월</Label>
            <Input
              type="number"
              value={value.reportMonth ?? currentMonth}
              min={1}
              max={12}
              onChange={(e) => onChange({ ...value, reportMonth: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {value.targetReportMode === 'weekly' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">시작일</Label>
            <Input
              type="date"
              value={value.reportStartDate ?? defaultWeekStart}
              onChange={(e) => onChange({ ...value, reportStartDate: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">종료일</Label>
            <Input
              type="date"
              value={value.reportEndDate ?? defaultWeekEnd}
              onChange={(e) => onChange({ ...value, reportEndDate: e.target.value })}
            />
          </div>
        </div>
      )}

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
