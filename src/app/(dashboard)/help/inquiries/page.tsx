import { PageWrapper } from '@/components/layout/page-wrapper'
import { getSupportTickets } from '@/app/actions/support'
import { InquiriesClient } from './inquiries-client'

export default async function InquiriesPage() {
  const result = await getSupportTickets()
  const tickets = result.success ? result.data : []

  return (
    <PageWrapper
      title="문의 내역"
      subtitle="내가 보낸 문의와 버그 제보를 확인하세요"
    >
      <InquiriesClient initialInquiries={tickets} />
    </PageWrapper>
  )
}
