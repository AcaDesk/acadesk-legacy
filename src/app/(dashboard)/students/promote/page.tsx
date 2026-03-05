/**
 * 학생 진급 관리 페이지
 */

import { PageWrapper } from '@/components/layout/page-wrapper'
import { PromotionWizard } from '@/components/features/students/promotion/promotion-wizard'

export const metadata = {
  title: '진급 관리 | Acadesk',
  description: '학년 진급 일괄 처리',
}

export default function StudentPromotionPage() {
  return (
    <PageWrapper title="진급 관리" description="학년이 바뀔 때 학생 학년·학교 정보를 일괄 업데이트합니다.">
      <PromotionWizard />
    </PageWrapper>
  )
}
