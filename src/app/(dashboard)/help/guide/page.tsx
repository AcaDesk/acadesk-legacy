import { PageWrapper } from '@/components/layout/page-wrapper'
import { GuideClient } from './guide-client'

export default function GuidePage() {
  return (
    <PageWrapper
      title="사용 가이드"
      subtitle="Acadesk의 주요 기능 사용법을 안내합니다"
    >
      <GuideClient />
    </PageWrapper>
  )
}
