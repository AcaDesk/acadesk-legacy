'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

// ============================================================================
// Types
// ============================================================================

export interface DatePickerProps {
  /**
   * The selected date value
   */
  value?: Date

  /**
   * Callback when the date changes
   * @param date - Selected date
   */
  onChange?: (date: Date | undefined) => void

  /**
   * Placeholder text when no date is selected
   * @default "날짜 선택"
   */
  placeholder?: string

  /**
   * Format string for displaying the date
   * @default "yyyy년 MM월 dd일"
   * @see https://date-fns.org/docs/format
   */
  dateFormat?: string

  /**
   * Function to disable specific dates
   * @example disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
   */
  disabled?: (date: Date) => boolean

  /**
   * Calendar caption layout
   * @default "label"
   */
  captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years'

  /**
   * Start year for dropdown (used with captionLayout="dropdown")
   */
  fromYear?: number

  /**
   * End year for dropdown (used with captionLayout="dropdown")
   */
  toYear?: number

  /**
   * Additional class name for the trigger button
   */
  className?: string

  /**
   * Align the popover content
   * @default "start"
   */
  align?: 'start' | 'center' | 'end'

  /**
   * ID for the button
   */
  id?: string

  /**
   * Whether the date picker is disabled
   */
  isDisabled?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * DatePicker Component
 *
 * 재사용 가능한 날짜 선택 컴포넌트
 *
 * ## 주요 기능
 * - Popover + Calendar UI 패턴을 캡슐화
 * - 한국어 날짜 포맷 기본 지원
 * - 날짜 범위 제한 가능 (disabled)
 * - 드롭다운 연도/월 선택 지원 (captionLayout)
 * - React Hook Form 완벽 호환
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [date, setDate] = useState<Date>()
 *
 * <DatePicker
 *   value={date}
 *   onChange={setDate}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <DatePicker
 *   value={form.watch('birthDate')}
 *   onChange={(date) => form.setValue('birthDate', date)}
 *   placeholder="생년월일 선택"
 * />
 * ```
 *
 * ### 날짜 범위 제한
 * ```tsx
 * <DatePicker
 *   value={date}
 *   onChange={setDate}
 *   disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
 *   placeholder="과거 날짜만 선택 가능"
 * />
 * ```
 *
 * ### 드롭다운 연도 선택
 * ```tsx
 * const currentYear = new Date().getFullYear()
 *
 * <DatePicker
 *   value={date}
 *   onChange={setDate}
 *   captionLayout="dropdown"
 *   fromYear={currentYear - 30}
 *   toYear={currentYear}
 * />
 * ```
 */
const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_FROM_YEAR = CURRENT_YEAR - 100
const DEFAULT_TO_YEAR = CURRENT_YEAR + 10

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = '날짜 선택',
      dateFormat = 'yyyy년 MM월 dd일',
      disabled,
      captionLayout = 'dropdown',
      fromYear = DEFAULT_FROM_YEAR,
      toYear = DEFAULT_TO_YEAR,
      className,
      align = 'start',
      id,
      isDisabled = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const handleSelect = React.useCallback(
      (date: Date | undefined) => {
        onChange?.(date)
        if (date) setOpen(false)
      },
      [onChange]
    )

    const handleToday = React.useCallback(() => {
      const today = new Date()
      if (disabled?.(today)) return
      onChange?.(today)
      setOpen(false)
    }, [disabled, onChange])

    const handleClear = React.useCallback(() => {
      onChange?.(undefined)
      setOpen(false)
    }, [onChange])

    const todayDisabled = disabled?.(new Date()) ?? false

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            variant="outline"
            disabled={isDisabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, dateFormat, { locale: ko }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={disabled}
            initialFocus
            captionLayout={captionLayout}
            fromYear={fromYear}
            toYear={toYear}
          />
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              disabled={todayDisabled}
            >
              오늘
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                선택 해제
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

DatePicker.displayName = 'DatePicker'

// Default export for better compatibility
export default DatePicker
