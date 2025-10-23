'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@ui/form'
import { Input } from '@ui/input'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Switch } from '@ui/switch'
import { EVENT_TYPE_CONFIG } from '@/core/types/calendar'
import { Plus, Loader2 } from 'lucide-react'

const eventFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().optional(),
  event_type: z.enum([
    'class',
    'exam',
    'consultation',
    'payment_due',
    'task_due',
    'birthday',
    'holiday',
    'event',
    'other',
  ]),
  start_date: z.string(),
  start_time: z.string().optional(),
  end_date: z.string(),
  end_time: z.string().optional(),
  all_day: z.boolean(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']),
  reminder_minutes: z.number().optional(),
  color: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventFormSchema>

interface AddEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EventFormValues) => Promise<void>
  initialStart?: Date
  initialEnd?: Date
}

export function AddEventModal({
  open,
  onOpenChange,
  onSubmit,
  initialStart,
  initialEnd,
}: AddEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: 'other',
      start_date: initialStart ? format(initialStart, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      start_time: initialStart ? format(initialStart, 'HH:mm') : '09:00',
      end_date: initialEnd ? format(initialEnd, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      end_time: initialEnd ? format(initialEnd, 'HH:mm') : '10:00',
      all_day: false,
      repeat: 'none',
      reminder_minutes: undefined,
      color: undefined,
    },
  })

  // Reset form when initial dates change
  useEffect(() => {
    if (initialStart) {
      form.setValue('start_date', format(initialStart, 'yyyy-MM-dd'))
      form.setValue('start_time', format(initialStart, 'HH:mm'))
    }
    if (initialEnd) {
      form.setValue('end_date', format(initialEnd, 'yyyy-MM-dd'))
      form.setValue('end_time', format(initialEnd, 'HH:mm'))
    }
  }, [initialStart, initialEnd, form])

  const handleSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allDay = form.watch('all_day')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            새 일정 추가
          </DialogTitle>
          <DialogDescription>
            학원의 새로운 일정을 등록합니다. 모든 필수 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 제목 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="일정 제목을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이벤트 타입 */}
            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>유형 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="일정 유형을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 종일 */}
            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">종일</FormLabel>
                    <FormDescription>
                      종일 일정으로 등록합니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 시작 날짜/시간 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작 날짜 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!allDay && (
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작 시간</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* 종료 날짜/시간 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료 날짜 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!allDay && (
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 시간</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* 설명 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="일정에 대한 추가 정보를 입력하세요"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 반복 */}
            <FormField
              control={form.control}
              name="repeat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>반복</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="반복 주기를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">반복 안 함</SelectItem>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">매주</SelectItem>
                      <SelectItem value="monthly">매월</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    반복 일정은 자동으로 생성됩니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 알림 */}
            <FormField
              control={form.control}
              name="reminder_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>알림</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? undefined : parseInt(value))}
                    defaultValue={field.value !== undefined ? field.value.toString() : 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="알림 시간을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">알림 없음</SelectItem>
                      <SelectItem value="0">일정 시작 시</SelectItem>
                      <SelectItem value="10">10분 전</SelectItem>
                      <SelectItem value="30">30분 전</SelectItem>
                      <SelectItem value="60">1시간 전</SelectItem>
                      <SelectItem value="1440">1일 전</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? '추가 중...' : '일정 추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
