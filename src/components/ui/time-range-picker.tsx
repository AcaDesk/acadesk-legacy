'use client'

import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { cn } from '@/lib/utils'

export interface TimeRangePickerProps {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  startLabel?: string
  endLabel?: string
  startError?: string
  endError?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

/**
 * TimeRangePicker 컴포넌트
 *
 * 시작 시간과 종료 시간을 선택하는 재사용 가능한 컴포넌트
 * React Hook Form과 함께 사용 가능
 *
 * @example
 * ```tsx
 * <TimeRangePicker
 *   startTime={startTime}
 *   endTime={endTime}
 *   onStartTimeChange={(value) => setValue('startTime', value)}
 *   onEndTimeChange={(value) => setValue('endTime', value)}
 *   startLabel="시작 시간"
 *   endLabel="종료 시간"
 *   startError={errors.startTime?.message}
 *   endError={errors.endTime?.message}
 *   required
 * />
 * ```
 */
export function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startLabel = '시작 시간',
  endLabel = '종료 시간',
  startError,
  endError,
  required = false,
  disabled = false,
  className,
}: TimeRangePickerProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      {/* 시작 시간 */}
      <div>
        <Label htmlFor="start-time" className="block text-sm font-medium mb-2">
          {startLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id="start-time"
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          disabled={disabled}
          className={cn(startError && 'border-red-500')}
        />
        {startError && (
          <p className="text-red-500 text-sm mt-1">{startError}</p>
        )}
      </div>

      {/* 종료 시간 */}
      <div>
        <Label htmlFor="end-time" className="block text-sm font-medium mb-2">
          {endLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id="end-time"
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          disabled={disabled}
          className={cn(endError && 'border-red-500')}
        />
        {endError && (
          <p className="text-red-500 text-sm mt-1">{endError}</p>
        )}
      </div>
    </div>
  )
}
