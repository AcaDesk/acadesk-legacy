import { getEffectiveFeatureStatus } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import KioskPage from './page-client'

export default async function KioskPageGate() {
  // kiosk는 공개 경로(학생용 독립 로그인) — 전역 오버라이드/코드 기본값만 적용
  const featureStatus = await getEffectiveFeatureStatus('kioskMode')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="키오스크 모드" description="학생들이 직접 출석 체크와 과제 완료를 확인할 수 있는 키오스크 화면 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="키오스크 모드" reason="키오스크 시스템 업데이트가 진행 중입니다." />;
  }

  return <KioskPage />
}
