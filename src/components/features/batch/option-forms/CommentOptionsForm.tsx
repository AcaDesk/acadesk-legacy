'use client'

import { Label } from '@ui/label'
import { Input } from '@ui/input'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import type { CommentOptions } from '@/core/types/batch.types'

interface CommentOptionsFormProps {
  value: CommentOptions
  onChange: (value: CommentOptions) => void
}

export function CommentOptionsForm({ value, onChange }: CommentOptionsFormProps) {
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
              targetReportMode: mode as CommentOptions['targetReportMode'],
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
        <Label className="text-sm font-medium mb-2 block">기존 코멘트 처리</Label>
        <RadioGroup
          value={value.overwriteExisting ? 'overwrite' : 'skip'}
          onValueChange={(v) =>
            onChange({ ...value, overwriteExisting: v === 'overwrite' })
          }
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="skip" id="comment-skip" />
            <Label htmlFor="comment-skip" className="text-sm">
              기존 코멘트가 있으면 건너뛰기
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="overwrite" id="comment-overwrite" />
            <Label htmlFor="comment-overwrite" className="text-sm">
              기존 코멘트 덮어쓰기
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
