'use client'

import { useState, useCallback } from 'react'
import { RRule } from 'rrule'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { AcademyCalendar } from '@/components/features/calendar/AcademyCalendar'
import { EventDetailModal } from '@/components/features/calendar/EventDetailModal'
import { AddEventModal } from '@/components/features/calendar/AddEventModal'
import { EditEventModal } from '@/components/features/calendar/EditEventModal'
import { Button } from '@ui/button'
import { Card } from '@ui/card'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
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

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailModalOpen(true)
  }, [])

  // Handle slot selection (for adding new events)
  const handleSelectSlot = useCallback(
    (info: { start: Date; end: Date; action: string }) => {
      setSlotInfo({ start: info.start, end: info.end })
      setIsAddModalOpen(true)
    },
    []
  )

  // Handle add event
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
      // Construct ISO timestamp (local time → UTC)
      const startAt = data.all_day
        ? new Date(`${data.start_date}T00:00:00`).toISOString()
        : new Date(`${data.start_date}T${data.start_time || '00:00'}:00`).toISOString()

      const endAt = data.all_day
        ? new Date(`${data.end_date}T23:59:59`).toISOString()
        : new Date(`${data.end_date}T${data.end_time || '00:00'}:00`).toISOString()

      // Generate RRULE if repeat is selected
      let rruleString: string | null = null
      if (data.repeat && data.repeat !== 'none') {
        const startDate = new Date(startAt)
        let freq: typeof RRule.DAILY | typeof RRule.WEEKLY | typeof RRule.MONTHLY = RRule.DAILY

        switch (data.repeat) {
          case 'daily':
            freq = RRule.DAILY
            break
          case 'weekly':
            freq = RRule.WEEKLY
            break
          case 'monthly':
            freq = RRule.MONTHLY
            break
        }

        const rule = new RRule({
          freq,
          dtstart: startDate,
          count: 52,
        })

        rruleString = rule.toString()
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

      if (!result.success) {
        throw new Error(result.error || '일정 추가에 실패했습니다')
      }

      // Update local state
      setEvents((prev) => [...prev, result.data!])

      const repeatMsg = data.repeat && data.repeat !== 'none' ? ` (${data.repeat === 'daily' ? '매일' : data.repeat === 'weekly' ? '매주' : '매월'} 반복)` : ''
      toast({
        title: '일정 추가 완료',
        description: `"${data.title}" 일정이 등록되었습니다${repeatMsg}.`,
      })
    } catch (error) {
      console.error('Failed to add event:', error)
      toast({
        variant: 'destructive',
        title: '일정 추가 실패',
        description: '일정을 추가하는데 실패했습니다.',
      })
      throw error
    }
  }

  // Handle edit event
  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailModalOpen(false)
    setIsEditModalOpen(true)
  }, [])

  // Handle update event
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
      // Construct ISO timestamp (local time → UTC)
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

      if (!result.success) {
        throw new Error(result.error || '일정 수정에 실패했습니다')
      }

      // Update local state
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? result.data! : e))
      )

      toast({
        title: '일정 수정 완료',
        description: `"${data.title}" 일정이 수정되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to update event:', error)
      toast({
        variant: 'destructive',
        title: '일정 수정 실패',
        description: '일정을 수정하는데 실패했습니다.',
      })
      throw error
    }
  }

  // Handle delete event - open confirmation dialog
  const handleDeleteEvent = useCallback(
    (event: CalendarEvent) => {
      setEventToDelete(event)
      setDeleteDialogOpen(true)
      setIsDetailModalOpen(false)
    },
    []
  )

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteCalendarEvent(eventToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '일정 삭제에 실패했습니다')
      }

      // Update local state
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id))

      toast({
        title: '일정 삭제 완료',
        description: `"${eventToDelete.title}" 일정이 삭제되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast({
        variant: 'destructive',
        title: '일정 삭제 실패',
        description: '일정을 삭제하는데 실패했습니다.',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(
    async (data: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const result = await updateCalendarEvent(data.event.id, {
          start_at: data.start.toISOString(),
          end_at: data.end.toISOString(),
        })

        if (!result.success) {
          throw new Error(result.error || '일정 이동에 실패했습니다')
        }

        // Update local state
        setEvents((prev) =>
          prev.map((e) => (e.id === data.event.id ? result.data! : e))
        )

        toast({
          title: '일정 변경 완료',
          description: `"${data.event.title}" 일정이 이동되었습니다.`,
        })
      } catch (error) {
        console.error('Failed to move event:', error)
        toast({
          variant: 'destructive',
          title: '일정 이동 실패',
          description: '일정을 이동하는데 실패했습니다.',
        })
      }
    },
    [toast]
  )

  // Handle event resize
  const handleEventResize = useCallback(
    async (data: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const result = await updateCalendarEvent(data.event.id, {
          start_at: data.start.toISOString(),
          end_at: data.end.toISOString(),
        })

        if (!result.success) {
          throw new Error(result.error || '일정 변경에 실패했습니다')
        }

        // Update local state
        setEvents((prev) =>
          prev.map((e) => (e.id === data.event.id ? result.data! : e))
        )

        toast({
          title: '일정 변경 완료',
          description: `"${data.event.title}" 일정 시간이 변경되었습니다.`,
        })
      } catch (error) {
        console.error('Failed to resize event:', error)
        toast({
          variant: 'destructive',
          title: '일정 변경 실패',
          description: '일정 시간을 변경하는데 실패했습니다.',
        })
      }
    },
    [toast]
  )

  return (
    <PageWrapper
      title="학원 캘린더"
      subtitle="학원의 모든 일정을 한눈에 관리하세요"
      icon={<CalendarIcon className="w-6 h-6" />}
      actions={
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          새 일정 추가
        </Button>
      }
    >
      <Card className="p-4">
        <div className="h-[calc(100vh-220px)] min-h-[600px]">
          <AcademyCalendar
            events={events}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            selectable
            draggable
            resizable
          />
        </div>
      </Card>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Add Event Modal */}
      <AddEventModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open)
          if (!open) {
            setSlotInfo(null)
          }
        }}
        onSubmit={handleAddEvent}
        initialStart={slotInfo?.start}
        initialEnd={slotInfo?.end}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        event={selectedEvent}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleUpdateEvent}
      />

      {/* Delete Confirmation Dialog */}
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
    </PageWrapper>
  )
}
