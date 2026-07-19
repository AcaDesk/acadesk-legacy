import { PageWrapper } from "@/components/layout/page-wrapper"
import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { TodoStatsContent } from './todo-stats-content'
import { getTodoStats } from '@/app/actions/todos'

export default async function TodoStatsPage() {
  // Feature flag checks
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('todoManagement')

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과제 통계" description="학생별, 과목별 과제 완료 현황을 상세한 통계로 확인하고 분석할 수 있는 기능을 준비하고 있습니다." />
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과제 통계" reason="통계 시스템 업데이트가 진행 중입니다." />
  }

  const result = await getTodoStats('week')
  const { overallStats, studentStats, subjectStats } = result.data

  return (
    <PageWrapper>
      <TodoStatsContent
        initialOverallStats={overallStats}
        initialStudentStats={studentStats}
        initialSubjectStats={subjectStats}
      />
    </PageWrapper>
  )
}
