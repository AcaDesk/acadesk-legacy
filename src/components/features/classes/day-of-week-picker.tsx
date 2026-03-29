'use client'

import { Button } from '@ui/button'
import { cn } from '@/lib/utils'

const DAYS = [
  { key: 'monday', label: '월' },
  { key: 'tuesday', label: '화' },
  { key: 'wednesday', label: '수' },
  { key: 'thursday', label: '목' },
  { key: 'friday', label: '금' },
  { key: 'saturday', label: '토' },
  { key: 'sunday', label: '일' },
] as const

interface DayOfWeekPickerProps {
  value: string[]
  onChange: (days: string[]) => void
  className?: string
}

export function DayOfWeekPicker({ value, onChange, className }: DayOfWeekPickerProps) {
  const toggle = (key: string) => {
    if (value.includes(key)) {
      onChange(value.filter(d => d !== key))
    } else {
      // 순서 유지: DAYS 순으로 정렬
      const next = DAYS.map(d => d.key).filter(k => k === key || value.includes(k))
      onChange(next)
    }
  }

  return (
    <div className={cn('flex gap-1.5', className)}>
      {DAYS.map(({ key, label }) => {
        const selected = value.includes(key)
        const isWeekend = key === 'saturday' || key === 'sunday'
        return (
          <Button
            key={key}
            type="button"
            variant={selected ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'w-9 h-9 p-0 text-sm font-medium',
              !selected && isWeekend && 'text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950'
            )}
            onClick={() => toggle(key)}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}

// 요일 배열 → 한글 문자열 (출석 탭 등 표시용)
const DAY_KEY_TO_KO: Record<string, string> = {
  monday: '월', tuesday: '화', wednesday: '수', thursday: '목',
  friday: '금', saturday: '토', sunday: '일',
}

export function formatDays(days: string[]): string {
  return DAYS.filter(d => days.includes(d.key)).map(d => d.label).join('/')
}

export function getDayKeyForDate(date: Date): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
}

export { DAY_KEY_TO_KO }
