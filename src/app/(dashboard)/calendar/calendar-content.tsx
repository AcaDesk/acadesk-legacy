'use client'

import { useState, useCallback } from 'react'
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

export function CalendarContent({ initialEvents }: CalendarContentProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [slotInfo, setSlotInfo] = useState<{ start: Date; end: Date } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  // 이벤트 클릭
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailModalOpen(true)
  }, [])

  // 슬롯 클릭 (날짜/시간 클릭 시 새 일정 등록)
  const handleSelectSlot = useCallback((info: { start: Date; end: Date; action: string }) => {
    setSlotInfo({ start: info.start, end: info.end })
    setIsAddModalOpen(true)
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
    setSelectedEvent(event)
    setIsDetailModalOpen(false)
    setIsEditModalOpen(true)
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
    setEventToDelete(event)
    setDeleteDialogOpen(true)
    setIsDetailModalOpen(false)
  }, [])

  // 일정 삭제 확정
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteCalendarEvent(eventToDelete.id)
      if (!result.success) throw new Error(result.error || '일정 삭제에 실패했습니다')

      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id))
      toast({ title: '일정 삭제 완료', description: `"${eventToDelete.title}" 일정이 삭제되었습니다.` })
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast({ variant: 'destructive', title: '일정 삭제 실패', description: '일정을 삭제하는데 실패했습니다.' })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6">
      <AcademyCalendar
        events={events}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onAddEvent={() => setIsAddModalOpen(true)}
      />

      {/* 일정 상세 모달 */}
      <EventDetailModal
        event={selectedEvent}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* 일정 추가 모달 */}
      <AddEventModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open)
          if (!open) setSlotInfo(null)
        }}
        onSubmit={handleAddEvent}
        initialStart={slotInfo?.start}
        initialEnd={slotInfo?.end}
      />

      {/* 일정 수정 모달 */}
      <EditEventModal
        event={selectedEvent}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleUpdateEvent}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={
          eventToDelete
            ? `"${eventToDelete.title}" 일정이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
