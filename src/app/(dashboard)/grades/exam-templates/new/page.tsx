import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import NewExamTemplatePage from './page-client'

export default async function NewExamTemplatePageGate() {
  // Feature flag: DB 오버라이드(전역/테넌트) > 코드 기본값
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('gradesManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="시험 템플릿 등록" description="반복되는 시험을 템플릿으로 등록하여 자동으로 생성하고 관리할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 템플릿 등록" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
  }

  return <NewExamTemplatePage />
}
