import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GradesListClient } from './list-client'
import { Skeleton } from '@ui/skeleton'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '성적 조회 | Acadesk',
  description: '학생별 시험 성적을 조회합니다.',
}

export default async function GradesListPage() {
  // Verify authentication
  await requireAuth()

  return (
    <Suspense fallback={<GradesListPageSkeleton />}>
      <GradesListClient />
    </Suspense>
  )
}

function GradesListPageSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </PageWrapper>
  )
}
