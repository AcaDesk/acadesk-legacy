import { Suspense } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { RetestsClient } from './retests-client'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@ui/skeleton'
import { requireAuth } from '@/lib/auth/helpers'

export const metadata = {
  title: '재시험 관리 | Acadesk',
  description: '재시험 대상 학생 관리',
}

export default async function RetestsPage() {
  // Verify authentication
  await requireAuth()

  return (
    <PageWrapper
      title="재시험 관리"
      subtitle="합격 점수 미달 학생들의 재시험을 관리합니다"
      icon={<AlertTriangle className="w-6 h-6" />}
    >
      <Suspense fallback={<RetestsPageSkeleton />}>
        <RetestsClient />
      </Suspense>
    </PageWrapper>
  )
}

function RetestsPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
