import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getReports, getStudentsForFilter } from '@/app/actions/reports'
import { ReportsContent } from './reports-content'

export default async function ReportsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 관리" description="생성된 모든 리포트를 조회하고 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 관리" reason="리포트 시스템 업데이트가 진행 중입니다." />;
  }

  // Fetch data on the server
  const [reportsResult, studentsResult] = await Promise.all([
    getReports(),
    getStudentsForFilter(),
  ])

  const reports = reportsResult.success && reportsResult.data ? reportsResult.data : []
  const students = studentsResult.success && studentsResult.data ? studentsResult.data : []

  return <ReportsContent initialReports={reports as any} initialStudents={students as any} />
}
