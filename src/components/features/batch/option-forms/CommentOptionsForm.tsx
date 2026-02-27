'use client'

import { Label } from '@ui/label'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import type { CommentOptions } from '@/core/types/batch.types'

interface CommentOptionsFormProps {
  value: CommentOptions
  onChange: (value: CommentOptions) => void
}

const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i)

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">대상 리포트</Label>
        <Select
          value={value.targetReportMode ?? 'latest'}
          onValueChange={(mode) => {
            // 모드 전환 시 해당 모드의 기본값을 함께 설정 (TARGET_MONTHLY_REQUIRED 버그 수정)
            if (mode === 'monthly') {
              onChange({
                ...value,
                targetReportMode: 'monthly',
                reportYear: value.reportYear ?? currentYear,
                reportMonth: value.reportMonth ?? currentMonth,
              })
            } else if (mode === 'weekly') {
              onChange({
                ...value,
                targetReportMode: 'weekly',
                reportStartDate: value.reportStartDate ?? formatDateStr(monday),
                reportEndDate: value.reportEndDate ?? formatDateStr(sunday),
              })
            } else {
              onChange({ ...value, targetReportMode: 'latest' })
            }
          }}
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
            <Select
              value={String(value.reportYear ?? currentYear)}
              onValueChange={(v) => onChange({ ...value, reportYear: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">월</Label>
            <Select
              value={String(value.reportMonth ?? currentMonth)}
              onValueChange={(v) => onChange({ ...value, reportMonth: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((label, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {value.targetReportMode === 'weekly' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">시작일</Label>
            <DatePicker
              value={value.reportStartDate ? parseDateStr(value.reportStartDate) : monday}
              onChange={(date) => date && onChange({ ...value, reportStartDate: formatDateStr(date) })}
              dateFormat="yyyy년 MM월 dd일"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">종료일</Label>
            <DatePicker
              value={value.reportEndDate ? parseDateStr(value.reportEndDate) : sunday}
              onChange={(date) => date && onChange({ ...value, reportEndDate: formatDateStr(date) })}
              dateFormat="yyyy년 MM월 dd일"
              disabled={(date) => {
                const startDate = value.reportStartDate ? parseDateStr(value.reportStartDate) : monday
                return date < startDate
              }}
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
