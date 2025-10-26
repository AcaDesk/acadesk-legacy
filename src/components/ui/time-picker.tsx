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
   * Time interval in minutes for minute selection
   * @default 30
   */
  interval?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse time string to hour and minute
 */
function parseTime(time: string): { hour24: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':')
  const hour24 = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  return { hour24, minute }
}

/**
 * Format time string for display
 */
function formatTimeDisplay(time: string): string {
  const { hour24, minute } = parseTime(time)
  const period = hour24 >= 12 ? '오후' : '오전'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  return `${period} ${hour12}:${minute.toString().padStart(2, '0')}`
}

/**
 * Generate hour options (0-23)
 */
function generateHourOptions(): Array<{ hour24: number; label: string }> {
  const hours: Array<{ hour24: number; label: string }> = []
  for (let h = 0; h < 24; h++) {
    const period = h >= 12 ? '오후' : '오전'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    hours.push({
      hour24: h,
      label: `${period} ${hour12}시`,
    })
  }
  return hours
}

/**
 * Generate minute options based on interval
 */
function generateMinuteOptions(interval: number): Array<{ minute: number; label: string }> {
  const minutes: Array<{ minute: number; label: string }> = []
  for (let m = 0; m < 60; m += interval) {
    minutes.push({
      minute: m,
      label: `${m.toString().padStart(2, '0')}분`,
    })
  }
  return minutes
}

// ============================================================================
// Component
// ============================================================================

/**
 * TimePicker Component
 *
 * 듀얼 컬럼 방식의 직관적인 시간 선택 컴포넌트
 *
 * ## 주요 기능
 * - 왼쪽: 시간 선택 컬럼 (오전 12시 ~ 오후 11시)
 * - 오른쪽: 분 선택 컬럼 (interval 기반)
 * - ScrollArea를 사용한 효율적인 탐색
 * - React Hook Form 완벽 호환
 *
 * ## UI/UX 개선
 * - 스크롤 최소화: 시간과 분을 분리하여 빠른 탐색
 * - 직관적 경험: "시간 먼저, 분 나중" 멘탈 모델과 일치
 * - 간결한 UI: 7~8개 항목만 표시하는 컴팩트한 디자인
 * - 자동 선택: 시간과 분 모두 선택 시 자동으로 완료
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

    // Parse current value
    const currentTime = value ? parseTime(value) : null

    // Local state for time selection
    const [selectedHour24, setSelectedHour24] = React.useState<number | null>(
      currentTime?.hour24 ?? null
    )
    const [selectedMinute, setSelectedMinute] = React.useState<number | null>(
      currentTime?.minute ?? null
    )

    // Generate options
    const hourOptions = React.useMemo(() => generateHourOptions(), [])
    const minuteOptions = React.useMemo(() => generateMinuteOptions(interval), [interval])

    // Update local state when value changes
    React.useEffect(() => {
      if (value) {
        const parsed = parseTime(value)
        setSelectedHour24(parsed.hour24)
        setSelectedMinute(parsed.minute)
      }
    }, [value])

    const handleTimeSelect = (hour24: number, minute: number) => {
      const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      onChange?.(timeString)
      setOpen(false)
    }

    const handleHourClick = (hour24: number) => {
      setSelectedHour24(hour24)
      // If minute is already selected, complete the selection
      if (selectedMinute !== null) {
        handleTimeSelect(hour24, selectedMinute)
      }
    }

    const handleMinuteClick = (minute: number) => {
      setSelectedMinute(minute)
      // If hour is already selected, complete the selection
      if (selectedHour24 !== null) {
        handleTimeSelect(selectedHour24, minute)
      }
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
          <div className="flex">
            {/* Hour Column */}
            <div className="flex-1 border-r">
              <div className="px-3 py-2 border-b bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground text-center">시간</p>
              </div>
              <ScrollArea className="h-[240px]">
                <div className="px-1 py-1">
                  {hourOptions.map((option) => (
                    <button
                      key={option.hour24}
                      type="button"
                      onClick={() => handleHourClick(option.hour24)}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md text-center transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedHour24 === option.hour24 &&
                          'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Minute Column */}
            <div className="flex-1">
              <div className="px-3 py-2 border-b bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground text-center">분</p>
              </div>
              <ScrollArea className="h-[240px]">
                <div className="px-1 py-1">
                  {minuteOptions.map((option) => (
                    <button
                      key={option.minute}
                      type="button"
                      onClick={() => handleMinuteClick(option.minute)}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-md text-center transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedMinute === option.minute &&
                          'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

TimePicker.displayName = 'TimePicker'
