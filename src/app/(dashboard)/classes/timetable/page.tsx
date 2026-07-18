import Link from 'next/link'
import { Button } from '@ui/button'
import { PageHeader } from '@ui/page-header'
import { ArrowLeft } from 'lucide-react'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'
import { getClassesWithDetails } from '@/app/actions/classes'
import { TimetableGrid } from './timetable-grid'
import type { TimetableClassInput } from '@/lib/timetable'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '주간 시간표',
  description: '수업 시간표를 요일×시간 그리드로 확인하고 강의실·강사 충돌을 점검하세요.',
}

/**
 * 주간 시간표 페이지 (Server Component)
 * classes.schedule(요일/시간)과 room/강사 정보를 그리드로 시각화한다.
 */
export default async function TimetablePage() {
  const result = await getClassesWithDetails()
  const classes = result.success && result.data ? result.data : []

  const inputs: TimetableClassInput[] = classes
    .filter((cls) => cls.active !== false)
    .map((cls) => ({
      id: cls.id,
      name: cls.name,
      subject: cls.subject,
      room: cls.room,
      instructorId: cls.instructorId,
      instructorName: cls.instructorName,
      schedule: cls.schedule,
    }))

  return (
    <PageErrorBoundary pageName="주간 시간표">
      <div className="p-6 lg:p-8 space-y-6">
        <PageHeader
          title="주간 시간표"
          description="수업 시간을 한눈에 확인하고 강의실·강사 충돌을 점검하세요"
          action={
            <Button variant="outline" asChild>
              <Link href="/classes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                수업 목록
              </Link>
            </Button>
          }
        />
        <TimetableGrid classes={inputs} />
      </div>
    </PageErrorBoundary>
  )
}
