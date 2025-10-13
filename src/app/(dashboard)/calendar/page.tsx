'use client'

import { useState, useEffect, useCallback } from 'react'
import { RRule } from 'rrule'
import { createClient } from '@/lib/supabase/client'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { AcademyCalendar } from '@/components/features/calendar/AcademyCalendar'
import { EventDetailModal } from '@/components/features/calendar/EventDetailModal'
import { AddEventModal } from '@/components/features/calendar/AddEventModal'
import { EditEventModal } from '@/components/features/calendar/EditEventModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import type { CalendarEvent } from '@/types/calendar'

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [slotInfo, setSlotInfo] = useState<{ start: Date; end: Date } | null>(null)

  const { toast } = useToast()
  const supabase = createClient()

  // Load events from database
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .is('deleted_at', null)
        .order('start_at', { ascending: true })

      if (error) throw error

      setEvents(data || [])
    } catch (error) {
      console.error('Failed to load calendar events:', error)
      toast({
        variant: 'destructive',
        title: '일정 로드 실패',
        description: '캘린더 일정을 불러오는데 실패했습니다.',
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

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
      // Construct ISO timestamp
      const startAt = data.all_day
        ? `${data.start_date}T00:00:00Z`
        : `${data.start_date}T${data.start_time || '00:00'}:00Z`

      const endAt = data.all_day
        ? `${data.end_date}T23:59:59Z`
        : `${data.end_date}T${data.end_time || '00:00'}:00Z`

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
          count: 52, // Generate 52 occurrences (1 year for weekly, etc.)
        })

        rruleString = rule.toString()
      }

      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert({
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_at: startAt,
          end_at: endAt,
          all_day: data.all_day,
          recurrence_rule: rruleString,
          reminder_minutes: data.reminder_minutes || null,
          color: data.color || null,
        })
        .select()
        .single()

      if (error) throw error

      // Reload events
      await loadEvents()

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
      // Construct ISO timestamp
      const startAt = data.all_day
        ? `${data.start_date}T00:00:00Z`
        : `${data.start_date}T${data.start_time || '00:00'}:00Z`

      const endAt = data.all_day
        ? `${data.end_date}T23:59:59Z`
        : `${data.end_date}T${data.end_time || '00:00'}:00Z`

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_at: startAt,
          end_at: endAt,
          all_day: data.all_day,
          reminder_minutes: data.reminder_minutes || null,
          color: data.color || null,
        })
        .eq('id', eventId)

      if (error) throw error

      // Reload events
      await loadEvents()

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

  // Handle delete event
  const handleDeleteEvent = useCallback(
    async (event: CalendarEvent) => {
      if (!confirm(`"${event.title}" 일정을 삭제하시겠습니까?`)) {
        return
      }

      try {
        const { error } = await supabase
          .from('calendar_events')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', event.id)

        if (error) throw error

        await loadEvents()

        toast({
          title: '일정 삭제 완료',
          description: `"${event.title}" 일정이 삭제되었습니다.`,
        })
      } catch (error) {
        console.error('Failed to delete event:', error)
        toast({
          variant: 'destructive',
          title: '일정 삭제 실패',
          description: '일정을 삭제하는데 실패했습니다.',
        })
      }
    },
    [supabase, loadEvents, toast]
  )

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(
    async (data: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            start_at: data.start.toISOString(),
            end_at: data.end.toISOString(),
          })
          .eq('id', data.event.id)

        if (error) throw error

        await loadEvents()

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
        await loadEvents() // Reload to revert UI
      }
    },
    [supabase, loadEvents, toast]
  )

  // Handle event resize
  const handleEventResize = useCallback(
    async (data: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            start_at: data.start.toISOString(),
            end_at: data.end.toISOString(),
          })
          .eq('id', data.event.id)

        if (error) throw error

        await loadEvents()

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
        await loadEvents() // Reload to revert UI
      }
    },
    [supabase, loadEvents, toast]
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
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">일정을 불러오는 중...</p>
            </div>
          </div>
        ) : (
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
        )}
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
    </PageWrapper>
  )
}
