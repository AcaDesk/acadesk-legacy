import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getCalendarEvents } from '@/app/actions/calendar'
import { CalendarContent } from './calendar-content'

export default async function CalendarPage() {
  // Feature flag checks
  const featureStatus = FEATURES.calendarIntegration;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="학원 캘린더" description="학원의 모든 일정을 캘린더로 관리하고, 수업, 시험, 행사 일정을 한눈에 파악할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="학원 캘린더" reason="캘린더 시스템 업데이트가 진행 중입니다." />;
  }

  // Fetch events on the server
  const result = await getCalendarEvents()
  const events = result.success && result.data ? result.data : []

  return <CalendarContent initialEvents={events} />
}
