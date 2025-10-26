'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

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
function parseTime(time: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [hourStr, minuteStr] = time.split(':')
  const hour24 = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24

  return { hour: hour12, minute, period }
}

/**
 * Convert 12-hour format to 24-hour format
 */
function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') {
    return hour12 === 12 ? 0 : hour12
  } else {
    return hour12 === 12 ? 12 : hour12 + 12
  }
}

/**
 * Format time string for display
 */
function formatTimeDisplay(time: string): string {
  const { hour, minute, period } = parseTime(time)
  const periodText = period === 'AM' ? '오전' : '오후'
  return `${periodText} ${hour}:${minute.toString().padStart(2, '0')}`
}

/**
 * Generate minute options based on interval
 */
function generateMinuteOptions(interval: number): number[] {
  const minutes: number[] = []
  for (let m = 0; m < 60; m += interval) {
    minutes.push(m)
  }
  return minutes
}

// ============================================================================
// Component
// ============================================================================

/**
 * TimePicker Component
 *
 * 개선된 시간 선택 컴포넌트
 *
 * ## 주요 기능
 * - 오전/오후 탭 선택
 * - 시간 그리드 (1-12)
 * - 분 그리드 (interval 기반)
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

    // Parse current value
    const currentTime = value ? parseTime(value) : null

    // Local state for time selection
    const [selectedPeriod, setSelectedPeriod] = React.useState<'AM' | 'PM'>(
      currentTime?.period || 'AM'
    )
    const [selectedHour, setSelectedHour] = React.useState<number | null>(
      currentTime?.hour || null
    )
    const [selectedMinute, setSelectedMinute] = React.useState<number | null>(
      currentTime?.minute ?? null
    )

    // Generate options
    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const minutes = React.useMemo(() => generateMinuteOptions(interval), [interval])

    // Update local state when value changes
    React.useEffect(() => {
      if (value) {
        const parsed = parseTime(value)
        setSelectedPeriod(parsed.period)
        setSelectedHour(parsed.hour)
        setSelectedMinute(parsed.minute)
      }
    }, [value])

    const handleTimeSelect = (hour: number, minute: number, period: 'AM' | 'PM') => {
      const hour24 = to24Hour(hour, period)
      const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      onChange?.(timeString)
      setOpen(false)
    }

    const handleHourClick = (hour: number) => {
      setSelectedHour(hour)
      // If minute is already selected, complete the selection
      if (selectedMinute !== null) {
        handleTimeSelect(hour, selectedMinute, selectedPeriod)
      }
    }

    const handleMinuteClick = (minute: number) => {
      setSelectedMinute(minute)
      // If hour is already selected, complete the selection
      if (selectedHour !== null) {
        handleTimeSelect(selectedHour, minute, selectedPeriod)
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
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(v as 'AM' | 'PM')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="AM">오전</TabsTrigger>
              <TabsTrigger value="PM">오후</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPeriod} className="p-3 space-y-3">
              {/* Hour Selection */}
              <div>
                <p className="text-sm font-medium mb-2">시</p>
                <div className="grid grid-cols-6 gap-1">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      type="button"
                      variant={selectedHour === hour ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-9 px-2',
                        selectedHour === hour && 'bg-primary text-primary-foreground'
                      )}
                      onClick={() => handleHourClick(hour)}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Minute Selection */}
              <div>
                <p className="text-sm font-medium mb-2">분</p>
                <div className="grid grid-cols-6 gap-1">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      type="button"
                      variant={selectedMinute === minute ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-9 px-2',
                        selectedMinute === minute && 'bg-primary text-primary-foreground'
                      )}
                      onClick={() => handleMinuteClick(minute)}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    )
  }
)

TimePicker.displayName = 'TimePicker'
