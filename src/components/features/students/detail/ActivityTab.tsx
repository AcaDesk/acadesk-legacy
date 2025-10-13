'use client'

import { ActivityTimeline } from '@/components/features/students/activity-timeline'

interface ActivityTabProps {
  studentId: string
}

export function ActivityTab({ studentId }: ActivityTabProps) {
  return (
    <div>
      <ActivityTimeline studentId={studentId} />
    </div>
  )
}
