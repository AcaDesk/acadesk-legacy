import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ExamTemplatesClient } from './exam-templates-client'
import { Skeleton } from '@ui/skeleton'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '시험 템플릿 | Acadesk',
  description: '반복되는 시험을 템플릿으로 관리합니다.',
}

export default async function ExamTemplatesPage() {
  // Verify authentication
  await requireAuth()

  return (
    <Suspense fallback={<ExamTemplatesPageSkeleton />}>
      <ExamTemplatesClient />
    </Suspense>
  )
}

function ExamTemplatesPageSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </PageWrapper>
  )
}
