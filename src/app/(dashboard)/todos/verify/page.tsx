import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import VerifyTodosPage from './page-client'

export default async function VerifyTodosPageGate() {
  // Feature flag: DB 오버라이드(전역/테넌트) > 코드 기본값
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('todoManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 검증" description="학생들이 완료한 과제를 검증하고 피드백을 제공할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 검증" reason="검증 시스템 업데이트가 진행 중입니다." />;
  }

  return <VerifyTodosPage />
}
