import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { redirect } from 'next/navigation'

export default async function BulkReportsPage() {
  const featureStatus = FEATURES.reportManagement

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 일괄 생성" description="여러 학생의 리포트를 한 번에 생성하고 자동으로 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 일괄 생성" reason="리포트 생성 시스템 업데이트가 진행 중입니다." />
  }

  redirect('/batch/new?action=report')
}
