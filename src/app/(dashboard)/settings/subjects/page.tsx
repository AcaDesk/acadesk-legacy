export const dynamic = 'force-dynamic'

import { getSubjectsWithStatistics } from '@/app/actions/subjects'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { SubjectsClient } from './subjects-client'

export default async function SubjectsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.subjectManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="과목 관리"
        description="학원의 과목을 등록하고 관리하여 수업과 성적 관리에 활용할 수 있는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="과목 관리"
        reason="과목 관리 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  // Fetch data on server
  const result = await getSubjectsWithStatistics()
  const subjects = result.success ? result.data : []

  return <SubjectsClient initialSubjects={subjects} />
}
