import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import TodoTemplatesPage from './page-client'

export default async function TodoTemplatesPageGate() {
  // Feature flag: DB 오버라이드(전역/테넌트) > 코드 기본값
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('todoManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 템플릿" description="반복되는 과제를 템플릿으로 관리하고 자동으로 배정하여 효율적으로 학습 관리를 할 수 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 템플릿" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  return <TodoTemplatesPage />
}
