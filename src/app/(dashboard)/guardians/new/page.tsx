import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import NewGuardianPage from './page-client'

export default async function NewGuardianPageGate() {
  // Feature flag: DB 오버라이드(전역/테넌트) > 코드 기본값
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('guardianManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="보호자 추가" description="새로운 보호자 정보를 등록하고 학생과 연결하여 효과적인 학부모 관리를 할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="보호자 추가" reason="보호자 관리 시스템 업데이트가 진행 중입니다." />;
  }

  return <NewGuardianPage />
}
