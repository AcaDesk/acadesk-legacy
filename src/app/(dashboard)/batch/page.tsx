import type { Metadata } from 'next'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { BatchHomeContent } from '@/components/features/batch/home/BatchHomeContent'

export const metadata: Metadata = {
  title: '일괄작업센터',
  description: '리포트 생성, 코멘트 등록, 메시지 전송을 일괄로 처리합니다.',
}

export default function BatchPage() {
  return (
    <PageWrapper
      title="일괄작업센터"
      subtitle="리포트 생성, 코멘트 등록, 메시지 전송을 일괄로 처리합니다."
    >
      <BatchHomeContent />
    </PageWrapper>
  )
}
