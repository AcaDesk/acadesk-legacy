'use client'

import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import { Checkbox } from '@ui/checkbox'
import type { ReportOptions } from '@/core/types/batch.types'

interface ReportOptionsFormProps {
  value: ReportOptions
  onChange: (value: ReportOptions) => void
}

const REPORT_SECTIONS = [
  { key: 'attendance', label: '출석 현황' },
  { key: 'grades', label: '성적 변화' },
  { key: 'homework', label: '과제 완료율' },
  { key: 'comment', label: '강사 코멘트' },
]

const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

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

export function ReportOptionsForm({ value, onChange }: ReportOptionsFormProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i)

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">리포트 타입</Label>
        <Select
          value={value.reportType || 'monthly'}
          onValueChange={(v) => {
            const nextType = v as ReportOptions['reportType']
            if (nextType === 'weekly') {
              onChange({
                ...value,
                reportType: 'weekly',
                weekStartDate: value.weekStartDate ?? formatDateStr(monday),
                weekEndDate: value.weekEndDate ?? formatDateStr(sunday),
              })
            } else {
              onChange({
                ...value,
                reportType: 'monthly',
                year: value.year ?? currentYear,
                month: value.month ?? currentMonth,
              })
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">월간 리포트</SelectItem>
            <SelectItem value="weekly">주간 리포트</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.reportType === 'weekly' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">시작일</Label>
            <DatePicker
              value={value.weekStartDate ? parseDateStr(value.weekStartDate) : monday}
              onChange={(date) => date && onChange({ ...value, weekStartDate: formatDateStr(date) })}
              dateFormat="yyyy년 MM월 dd일"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">종료일</Label>
            <DatePicker
              value={value.weekEndDate ? parseDateStr(value.weekEndDate) : sunday}
              onChange={(date) => date && onChange({ ...value, weekEndDate: formatDateStr(date) })}
              dateFormat="yyyy년 MM월 dd일"
              disabled={(date) => {
                const startDate = value.weekStartDate ? parseDateStr(value.weekStartDate) : monday
                return date < startDate
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">기준 년도</Label>
            <Select
              value={String(value.year || currentYear)}
              onValueChange={(v) => onChange({ ...value, year: Number(v) })}
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
            <Label className="text-sm font-medium mb-1.5 block">기준 월</Label>
            <Select
              value={String(value.month || currentMonth)}
              onValueChange={(v) => onChange({ ...value, month: Number(v) })}
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

      <div>
        <Label className="text-sm font-medium mb-2 block">포함 섹션</Label>
        <div className="space-y-2">
          {REPORT_SECTIONS.map((section) => {
            const checked = value.includedSections?.includes(section.key) ?? true
            return (
              <div key={section.key} className="flex items-center gap-2">
                <Checkbox
                  id={`section-${section.key}`}
                  checked={checked}
                  onCheckedChange={(c) => {
                    const current = value.includedSections ?? REPORT_SECTIONS.map((s) => s.key)
                    const next = c
                      ? [...current, section.key]
                      : current.filter((k) => k !== section.key)
                    onChange({ ...value, includedSections: next })
                  }}
                />
                <Label htmlFor={`section-${section.key}`} className="text-sm">
                  {section.label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
