'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { RRule } from 'rrule'
import { AcademyCalendar } from '@/components/features/calendar/AcademyCalendar'
import { EventDetailModal } from '@/components/features/calendar/EventDetailModal'
import { AddEventModal } from '@/components/features/calendar/AddEventModal'
import { EditEventModal } from '@/components/features/calendar/EditEventModal'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import type { CalendarEvent } from '@/core/types/calendar'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/app/actions/calendar'

interface CalendarContentProps {
  initialEvents: CalendarEvent[]
}

// 캘린더 다이얼로그 통합 상태 (discriminated union)
type ActiveDialog =
  | { type: 'detail'; event: CalendarEvent }
  | { type: 'add'; slot: { start: Date; end: Date } | null }
  | { type: 'edit'; event: CalendarEvent }
  | { type: 'delete'; event: CalendarEvent }

export function CalendarContent({ initialEvents }: CalendarContentProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

  const { toast } = useToast()

  const closeDialog = useCallback(() => setActiveDialog(null), [])

  // 상세/수정 모달이 참조할 이벤트 (닫힘 애니메이션 중에도 유지)
  const dialogEvent =
    activeDialog?.type === 'detail' || activeDialog?.type === 'edit'
      ? activeDialog.event
      : null

  // 이벤트 클릭
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setActiveDialog({ type: 'detail', event })
  }, [])

  // 슬롯 클릭 (날짜/시간 클릭 시 새 일정 등록)
  const handleSelectSlot = useCallback((info: { start: Date; end: Date; action: string }) => {
    setActiveDialog({ type: 'add', slot: { start: info.start, end: info.end } })
  }, [])

  // 일정 추가
  const handleAddEvent = async (data: {
    title: string
    description?: string
    event_type: string
    start_date: string
    start_time?: string
    end_date: string
    end_time?: string
    all_day: boolean
    repeat?: string
    reminder_minutes?: number
    color?: string
  }) => {
    try {
      const startAt = data.all_day
        ? new Date(`${data.start_date}T00:00:00`).toISOString()
        : new Date(`${data.start_date}T${data.start_time || '00:00'}:00`).toISOString()

      const endAt = data.all_day
        ? new Date(`${data.end_date}T23:59:59`).toISOString()
        : new Date(`${data.end_date}T${data.end_time || '00:00'}:00`).toISOString()

      let rruleString: string | null = null
      if (data.repeat && data.repeat !== 'none') {
        const startDate = new Date(startAt)
        let freq: typeof RRule.DAILY | typeof RRule.WEEKLY | typeof RRule.MONTHLY = RRule.DAILY
        if (data.repeat === 'weekly') freq = RRule.WEEKLY
        else if (data.repeat === 'monthly') freq = RRule.MONTHLY

        rruleString = new RRule({ freq, dtstart: startDate, count: 52 }).toString()
      }

      const result = await createCalendarEvent({
        title: data.title,
        description: data.description || null,
        event_type: data.event_type,
        start_at: startAt,
        end_at: endAt,
        all_day: data.all_day,
        recurrence_rule: rruleString,
        reminder_minutes: data.reminder_minutes ?? null,
        color: data.color || null,
      })

      if (!result.success) throw new Error(result.error || '일정 추가에 실패했습니다')

      setEvents((prev) => [...prev, result.data!])

      const repeatMsg =
        data.repeat && data.repeat !== 'none'
          ? ` (${data.repeat === 'daily' ? '매일' : data.repeat === 'weekly' ? '매주' : '매월'} 반복)`
          : ''
      toast({ title: '일정 추가 완료', description: `"${data.title}" 일정이 등록되었습니다${repeatMsg}.` })
    } catch (error) {
      console.error('Failed to add event:', error)
      toast({ variant: 'destructive', title: '일정 추가 실패', description: '일정을 추가하는데 실패했습니다.' })
      throw error
    }
  }

  // 일정 수정 모달 열기
  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setActiveDialog({ type: 'edit', event })
  }, [])

  // 일정 수정 저장
  const handleUpdateEvent = async (
    eventId: string,
    data: {
      title: string
      description?: string
      event_type: string
      start_date: string
      start_time?: string
      end_date: string
      end_time?: string
      all_day: boolean
      reminder_minutes?: number
      color?: string
    }
  ) => {
    try {
      const startAt = data.all_day
        ? new Date(`${data.start_date}T00:00:00`).toISOString()
        : new Date(`${data.start_date}T${data.start_time || '00:00'}:00`).toISOString()

      const endAt = data.all_day
        ? new Date(`${data.end_date}T23:59:59`).toISOString()
        : new Date(`${data.end_date}T${data.end_time || '00:00'}:00`).toISOString()

      const result = await updateCalendarEvent(eventId, {
        title: data.title,
        description: data.description || null,
        event_type: data.event_type,
        start_at: startAt,
        end_at: endAt,
        all_day: data.all_day,
        reminder_minutes: data.reminder_minutes ?? null,
        color: data.color || null,
      })

      if (!result.success) throw new Error(result.error || '일정 수정에 실패했습니다')

      setEvents((prev) => prev.map((e) => (e.id === eventId ? result.data! : e)))
      toast({ title: '일정 수정 완료', description: `"${data.title}" 일정이 수정되었습니다.` })
    } catch (error) {
      console.error('Failed to update event:', error)
      toast({ variant: 'destructive', title: '일정 수정 실패', description: '일정을 수정하는데 실패했습니다.' })
      throw error
    }
  }

  // 일정 삭제 확인 다이얼로그 열기
  const handleDeleteEvent = useCallback((event: CalendarEvent) => {
    setActiveDialog({ type: 'delete', event })
  }, [])

  // 일정 삭제 확정
  const deleteMutation = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      const result = await deleteCalendarEvent(event.id)
      if (!result.success) throw new Error(result.error || '일정 삭제에 실패했습니다')
      return event
    },
    onSuccess: (event) => {
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
      toast({ title: '일정 삭제 완료', description: `"${event.title}" 일정이 삭제되었습니다.` })
    },
    onError: (error) => {
      console.error('Failed to delete event:', error)
      toast({ variant: 'destructive', title: '일정 삭제 실패', description: '일정을 삭제하는데 실패했습니다.' })
    },
    onSettled: () => closeDialog(),
  })

  const handleConfirmDelete = () => {
    if (activeDialog?.type === 'delete') {
      deleteMutation.mutate(activeDialog.event)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6">
      <AcademyCalendar
        events={events}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onAddEvent={() => setActiveDialog({ type: 'add', slot: null })}
      />

      {/* 일정 상세 모달 */}
      <EventDetailModal
        event={dialogEvent}
        open={activeDialog?.type === 'detail'}
        onOpenChange={(open) => !open && closeDialog()}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* 일정 추가 모달 */}
      <AddEventModal
        open={activeDialog?.type === 'add'}
        onOpenChange={(open) => !open && closeDialog()}
        onSubmit={handleAddEvent}
        initialStart={activeDialog?.type === 'add' ? activeDialog.slot?.start : undefined}
        initialEnd={activeDialog?.type === 'add' ? activeDialog.slot?.end : undefined}
      />

      {/* 일정 수정 모달 */}
      <EditEventModal
        event={dialogEvent}
        open={activeDialog?.type === 'edit'}
        onOpenChange={(open) => !open && closeDialog()}
        onSubmit={handleUpdateEvent}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        open={activeDialog?.type === 'delete'}
        onOpenChange={(open) => !open && closeDialog()}
        title="정말로 삭제하시겠습니까?"
        description={
          activeDialog?.type === 'delete'
            ? `"${activeDialog.event.title}" 일정이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
