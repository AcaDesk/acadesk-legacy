// Calendar Event Types

export type EventType =
  | 'class'
  | 'exam'
  | 'consultation'
  | 'payment_due'
  | 'task_due'
  | 'birthday'
  | 'holiday'
  | 'event'
  | 'other'

export interface CalendarEvent {
  id: string
  tenant_id: string
  title: string
  description: string | null
  event_type: EventType
  start_at: string // ISO 8601 timestamp
  end_at: string // ISO 8601 timestamp
  all_day: boolean
  color: string | null
  class_id: string | null
  student_id: string | null
  guardian_id: string | null
  exam_id: string | null
  consultation_id: string | null
  recurrence_rule: string | null
  recurrence_exception: string[] | null
  parent_event_id: string | null
  reminder_minutes: number | null
  meta: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BigCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: CalendarEvent
}

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  {
    label: string
    color: string
    icon?: string
  }
> = {
  class: {
    label: '수업',
    color: '#3b82f6', // blue
  },
  exam: {
    label: '시험',
    color: '#8b5cf6', // purple
  },
  consultation: {
    label: '상담',
    color: '#10b981', // green
  },
  payment_due: {
    label: '납부 마감',
    color: '#ef4444', // red
  },
  task_due: {
    label: '과제 마감',
    color: '#f59e0b', // amber
  },
  birthday: {
    label: '생일',
    color: '#ec4899', // pink
  },
  holiday: {
    label: '휴일',
    color: '#6b7280', // gray
  },
  event: {
    label: '학원 이벤트',
    color: '#06b6d4', // cyan
  },
  other: {
    label: '기타',
    color: '#64748b', // slate
  },
}
