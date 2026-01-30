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

  // Mock data for dashboard stats
  // TODO: Replace with actual data fetching from server action
  const stats = {
    totalBilled: 15000000,
    totalCollected: 12500000,
    totalUnpaid: 2500000,
    unpaidCount: 8,
    overdueCount: 3,
    collectionRate: 83.3,
  }

  return <PaymentsContent initialStats={stats} />
}
