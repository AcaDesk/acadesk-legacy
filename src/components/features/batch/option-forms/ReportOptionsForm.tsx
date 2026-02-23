'use client'

import { Label } from '@ui/label'
import { Input } from '@ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
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

export function ReportOptionsForm({ value, onChange }: ReportOptionsFormProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-1.5 block">리포트 타입</Label>
        <Select
          value={value.reportType || 'monthly'}
          onValueChange={(v) => onChange({ ...value, reportType: v })}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">기준 년도</Label>
          <Input
            type="number"
            value={value.year || currentYear}
            onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
            min={2020}
            max={2030}
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">기준 월</Label>
          <Input
            type="number"
            value={value.month || currentMonth}
            onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
            min={1}
            max={12}
          />
        </div>
      </div>

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
