import { PageWrapper } from '@/components/layout/page-wrapper'
import { InquiriesClient } from './inquiries-client'

// Static inquiry data (TODO: Replace with API call)
const mockInquiries = [
  {
    id: '1',
    type: 'inquiry' as const,
    category: '기능 문의',
    subject: '엑셀 내보내기 기능 문의',
    message: '학생 데이터를 엑셀로 내보낼 때 특정 필드만 선택할 수 있나요?',
    status: 'resolved' as const,
    createdAt: new Date(2025, 9, 10).toISOString(),
    respondedAt: new Date(2025, 9, 11).toISOString(),
    response:
      '네, 가능합니다. 엑셀 내보내기 대화상자에서 "필드 선택" 옵션을 통해 원하는 필드만 선택하여 내보낼 수 있습니다.',
  },
  {
    id: '2',
    type: 'bug' as const,
    category: '버그 제보',
    subject: '출석 체크 저장 오류',
    message:
      '출석 체크 후 저장 버튼을 클릭해도 간헐적으로 저장이 안 되는 현상이 있습니다.',
    status: 'in_progress' as const,
    createdAt: new Date(2025, 9, 12).toISOString(),
  },
  {
    id: '3',
    type: 'inquiry' as const,
    category: '사용법 문의',
    subject: '과제 템플릿 사용 방법',
    message: '과제 템플릿을 만들어두고 매주 반복해서 사용하고 싶습니다.',
    status: 'resolved' as const,
    createdAt: new Date(2025, 9, 8).toISOString(),
    respondedAt: new Date(2025, 9, 9).toISOString(),
    response:
      'TODO 관리 > 템플릿 관리 메뉴에서 템플릿을 생성하실 수 있습니다. 자세한 방법은 사용 가이드를 참고해주세요.',
  },
  {
    id: '4',
    type: 'inquiry' as const,
    category: '결제 문의',
    subject: '플랜 업그레이드 문의',
    message: '현재 베이직 플랜을 사용 중인데 프로 플랜으로 업그레이드하고 싶습니다.',
    status: 'pending' as const,
    createdAt: new Date(2025, 9, 13).toISOString(),
  },
]

export default function InquiriesPage() {
  // TODO: Replace with actual API call
  // const result = await getInquiries()
  // const inquiries = result.success ? result.data : []

  return (
    <PageWrapper
      title="문의 내역"
      subtitle="내가 보낸 문의와 버그 제보를 확인하세요"
    >
      <InquiriesClient initialInquiries={mockInquiries} />
    </PageWrapper>
  )
}
