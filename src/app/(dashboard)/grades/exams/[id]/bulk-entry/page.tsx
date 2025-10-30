import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { BulkGradeEntryClient } from './bulk-entry-client'
import { Skeleton } from '@ui/skeleton'
import { requireAuth } from '@/lib/auth/helpers'
import { getExamById } from '@/app/actions/exams'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: '성적 일괄 입력 | Acadesk',
  description: '시험 성적을 일괄 입력합니다.',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function BulkGradeEntryPage({ params }: Props) {
  // Verify authentication
  await requireAuth()

  // Get exam ID from params
  const { id: examId } = await params

  // Fetch exam data using Server Action
  const examResult = await getExamById(examId)

  if (!examResult.success || !examResult.data) {
    notFound()
  }

  return (
    <Suspense fallback={<BulkEntryPageSkeleton />}>
      <BulkGradeEntryClient exam={examResult.data} />
    </Suspense>
  )
}

function BulkEntryPageSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </PageWrapper>
  )
}
