import type { Metadata } from 'next'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { JobsContent } from '@/components/features/jobs/JobsContent'

export const metadata: Metadata = {
  title: '작업 이력',
  description: '일괄 작업 실행 이력을 확인하고 관리합니다.',
}

export default function JobsPage() {
  return (
    <PageWrapper
      title="작업 이력"
      subtitle="일괄 작업 실행 이력을 확인하고 관리합니다."
    >
      <JobsContent />
    </PageWrapper>
  )
}
