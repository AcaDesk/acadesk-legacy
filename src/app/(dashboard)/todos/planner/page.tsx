import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import WeeklyPlannerPage from './page-client'

export default async function WeeklyPlannerPageGate() {
  // Feature flag: DB 오버라이드(전역/테넌트) > 코드 기본값
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('todoManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="주간 학습 플래너" description="학생별 주간 과제를 한 화면에서 계획하고 일괄 배정할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="주간 학습 플래너" reason="플래너 시스템 업데이트가 진행 중입니다." />;
  }

  return <WeeklyPlannerPage />
}
