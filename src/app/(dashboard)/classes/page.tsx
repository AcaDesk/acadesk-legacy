export const dynamic = 'force-dynamic'

import { getClassesWithDetails } from '@/app/actions/classes'
import { ClassesPageClient } from './classes-page-client'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { LoadingState } from '@/components/ui/loading-state'

export default async function ClassesPage() {
  // Fetch data on server
  const result = await getClassesWithDetails()

  if (!result.success || !result.data) {
    return (
      <PageWrapper>
        <LoadingState variant="card" message="수업 목록을 불러오는 중 오류가 발생했습니다." />
      </PageWrapper>
    )
  }

  return <ClassesPageClient initialData={result.data} />
}
