import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { PaymentsContent } from './payments-content'

export default function PaymentsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.tuitionManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="학원비 관리" description="월별 청구, 수납 현황 및 미납 관리를 자동화하여 효율적인 재무 관리를 지원하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="학원비 관리" reason="학원비 관리 시스템 업데이트가 진행 중입니다." />;
  }

  return <PaymentsContent />
}
