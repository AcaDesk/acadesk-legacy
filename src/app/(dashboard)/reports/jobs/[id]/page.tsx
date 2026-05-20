import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { getBatchJobDetail } from '@/app/actions/batch/jobs'
import { JobDetailContent } from '@/components/features/jobs/JobDetailContent'

export const metadata: Metadata = {
  title: '작업 상세',
  description: '일괄 작업 실행 결과를 확인합니다.',
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getBatchJobDetail(id)

  if (!result.success || !result.data) {
    redirect('/reports?tab=jobs')
  }

  return (
    <PageWrapper title="작업 상세">
      <JobDetailContent
        initialJob={result.data.job}
        initialItems={result.data.items}
      />
    </PageWrapper>
  )
}
