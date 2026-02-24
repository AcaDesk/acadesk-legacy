import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { EntryClient } from './entry-client'
import { Skeleton } from '@ui/skeleton'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { requireAuth } from '@/lib/auth/helpers'
import { getExamsForGradeEntry } from '@/app/actions/grades/grade-entry'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '성적 입력 | Acadesk',
  description: '시험별로 성적을 입력하고 관리합니다.',
}

export default async function GradeEntryPage() {
  // Feature flag checks
  const featureStatus = FEATURES.gradesManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="성적 입력"
        description="시험별로 학생 성적을 입력하고 진행 상황을 확인할 수 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="성적 입력"
        reason="성적 입력 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  // Verify authentication
  await requireAuth()

  // Prefetch only pending exams (default tab)
  const result = await getExamsForGradeEntry({ completed: false, period: 'this_month' })

  const initialExams = result.success && result.data ? result.data : []

  return (
    <PageWrapper>
      <Suspense fallback={<GradeEntryPageSkeleton />}>
        <EntryClient initialExams={initialExams} />
      </Suspense>
    </PageWrapper>
  )
}

function GradeEntryPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
