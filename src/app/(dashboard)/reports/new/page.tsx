import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getStudentsForReport } from '@/app/actions/reports'
import { NewReportContent } from './new-report-content'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: {
    name: string
  } | null
  class_enrollments?: Array<{
    classes: {
      name: string
    } | null
  }>
}

export default async function NewReportPage() {
  // Feature flag checks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="월간 리포트" description="학생별 월간 성적, 출석, 과제 완료율을 자동으로 분석하여 리포트를 생성하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="월간 리포트" reason="리포트 생성 시스템 업그레이드가 진행 중입니다." />;
  }

  // Fetch students on the server
  const result = await getStudentsForReport()
  const students: Student[] = result.success && result.data
    ? (result.data as unknown as Student[])
    : []

  return <NewReportContent initialStudents={students} />
}
