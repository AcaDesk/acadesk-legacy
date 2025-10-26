'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { ScrollArea } from './scroll-area'

// ============================================================================
// Types
// ============================================================================

export interface TimePickerProps {
  /**
   * The selected time value in HH:mm format (24-hour)
   * @example "14:30"
   */
  value?: string

  /**
   * Callback when the time changes
   * @param time - Selected time in HH:mm format
   */
  onChange?: (time: string) => void

  /**
   * Placeholder text when no time is selected
   * @default "시간 선택"
   */
  placeholder?: string

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
   * Whether the time picker is disabled
   */
  disabled?: boolean

  /**
   * Time interval in minutes
   * @default 30
   */
  interval?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate time options based on interval
 */
function generateTimeOptions(interval: number = 30): string[] {
  const times: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      times.push(`${h}:${m}`)
    }
  }
  return times
}

/**
 * Format time string for display
 */
function formatTimeDisplay(time: string): string {
  const [hour, minute] = time.split(':')
  const h = parseInt(hour, 10)
  const period = h >= 12 ? '오후' : '오전'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${period} ${displayHour}:${minute}`
}

// ============================================================================
// Component
// ============================================================================

/**
 * TimePicker Component
 *
 * 재사용 가능한 시간 선택 컴포넌트 (DatePicker와 동일한 UI/UX)
 *
 * ## 주요 기능
 * - Popover + 시간 리스트 UI 패턴
 * - 12시간/24시간 형식 표시
 * - 시간 간격 설정 가능 (기본 30분)
 * - React Hook Form 완벽 호환
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [time, setTime] = useState<string>('14:00')
 *
 * <TimePicker
 *   value={time}
 *   onChange={setTime}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <TimePicker
 *   value={form.watch('startTime')}
 *   onChange={(time) => form.setValue('startTime', time)}
 *   placeholder="시작 시간 선택"
 *   interval={15}
 * />
 * ```
 */
export const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = '시간 선택',
      className,
      align = 'start',
      id,
      disabled = false,
      interval = 30,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const timeOptions = React.useMemo(() => generateTimeOptions(interval), [interval])

    const handleSelect = (time: string) => {
      onChange?.(time)
      setOpen(false)
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {value ? formatTimeDisplay(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {timeOptions.map((time) => (
                <Button
                  key={time}
                  variant={value === time ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start font-normal',
                    value === time && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => handleSelect(time)}
                >
                  {formatTimeDisplay(time)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    )
  }
)

TimePicker.displayName = 'TimePicker'
