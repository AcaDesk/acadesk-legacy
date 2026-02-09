import { PageWrapper } from '@/components/layout/page-wrapper'
import { FileQuestion } from 'lucide-react'
import { FAQClient } from './faq-client'

// Static FAQ data
const faqCategories = [
  { id: 'general', label: '일반', color: 'bg-info/10 text-info' },
  { id: 'account', label: '계정', color: 'bg-green-100 text-green-600' },
  { id: 'billing', label: '결제', color: 'bg-purple-100 text-purple-600' },
  { id: 'features', label: '기능', color: 'bg-orange-100 text-orange-600' },
  { id: 'technical', label: '기술', color: 'bg-red-100 text-red-600' },
]

const faqs = [
  {
    category: 'general',
    question: 'Acadesk는 어떤 서비스인가요?',
    answer:
      'Acadesk는 학원 운영을 위한 종합 관리 시스템입니다. 학생 관리, 출석 체크, 성적 관리, 과제 배정, 리포트 생성 등 학원 운영에 필요한 모든 기능을 제공합니다.',
  },
  {
    category: 'account',
    question: '이메일 주소를 변경하고 싶어요',
    answer:
      '설정 > 계정 설정 페이지에서 이메일 주소를 변경하실 수 있습니다. 새 이메일로 인증 링크가 발송되며, 링크를 클릭하여 인증을 완료해야 변경이 완료됩니다.',
  },
  {
    category: 'account',
    question: '여러 명이 하나의 계정을 사용할 수 있나요?',
    answer:
      '네, 직원 관리 기능을 통해 여러 명의 직원 계정을 추가할 수 있습니다. 각 직원은 고유한 계정으로 로그인하며, 권한 설정을 통해 접근 가능한 기능을 제한할 수 있습니다.',
  },
  {
    category: 'billing',
    question: '결제 수단은 어떤 것들이 있나요?',
    answer:
      '신용카드, 체크카드, 계좌이체를 지원합니다. 결제 정보는 안전하게 암호화되어 저장되며, 월 자동 결제 또는 연 단위 결제를 선택하실 수 있습니다.',
  },
  {
    category: 'billing',
    question: '중도 해지 시 환불이 가능한가요?',
    answer:
      '연 단위로 결제하신 경우, 사용하지 않은 기간에 대해 일할 계산하여 환불해드립니다. 월 단위 결제의 경우 다음 결제일 전까지 해지하시면 추가 요금이 발생하지 않습니다.',
  },
  {
    category: 'billing',
    question: '요금제를 변경할 수 있나요?',
    answer:
      '언제든지 요금제를 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 즉시 적용되며, 다운그레이드는 다음 결제 주기부터 적용됩니다.',
  },
  {
    category: 'features',
    question: '학생 수에 제한이 있나요?',
    answer:
      '요금제에 따라 등록 가능한 학생 수가 다릅니다. 베이직 플랜은 최대 50명, 프로 플랜은 최대 120명, 엔터프라이즈 플랜은 무제한입니다.',
  },
  {
    category: 'features',
    question: '데이터를 백업할 수 있나요?',
    answer:
      '네, 설정 > 데이터 관리에서 언제든지 전체 데이터를 Excel 또는 CSV 형식으로 내보내기(백업)할 수 있습니다. 또한 시스템에서 자동으로 매일 백업을 수행하고 있습니다.',
  },
  {
    category: 'features',
    question: 'SMS나 카카오톡으로 알림을 보낼 수 있나요?',
    answer:
      '네, 출석 알림, 과제 알림, 리포트 발송 등을 SMS 또는 카카오톡으로 보호자에게 전송할 수 있습니다. 단, SMS와 카카오톡 발송은 별도 요금이 부과됩니다.',
  },
  {
    category: 'features',
    question: '리포트를 PDF로 저장할 수 있나요?',
    answer:
      '네, 생성된 리포트는 PDF로 다운로드하거나 이메일로 직접 발송할 수 있습니다. PDF에는 학생 정보, 출석 통계, 성적 그래프, 과제 완료율 등이 포함됩니다.',
  },
  {
    category: 'technical',
    question: '인터넷 연결이 끊겼을 때도 사용할 수 있나요?',
    answer:
      '현재는 인터넷 연결이 필요합니다. 추후 업데이트를 통해 오프라인 모드를 지원할 예정입니다.',
  },
  {
    category: 'technical',
    question: '데이터는 안전하게 보관되나요?',
    answer:
      '모든 데이터는 암호화되어 안전한 클라우드 서버에 저장됩니다. 정기적인 백업과 보안 점검을 실시하고 있으며, 개인정보는 별도 암호화 처리되어 관리됩니다.',
  },
  {
    category: 'technical',
    question: '어떤 브라우저를 지원하나요?',
    answer:
      'Chrome, Safari, Firefox, Edge 등 최신 버전의 모든 주요 브라우저를 지원합니다. 최상의 경험을 위해 항상 최신 버전의 브라우저를 사용하시는 것을 권장합니다.',
  },
]

export default function FAQPage() {
  return (
    <PageWrapper
      title="자주 묻는 질문 (FAQ)"
      subtitle="자주 묻는 질문과 답변을 확인하세요"
      icon={<FileQuestion className="w-6 h-6" />}
    >
      <FAQClient faqs={faqs} categories={faqCategories} />
    </PageWrapper>
  )
}
