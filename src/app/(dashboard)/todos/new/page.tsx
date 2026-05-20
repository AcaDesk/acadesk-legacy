import { PageWrapper } from '@/components/layout/page-wrapper'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getStudentsMaster } from '@/app/actions/students/queries'
import { NewTodoForm } from './new-todo-form'

export default async function NewTodoPage() {
  const featureStatus = FEATURES.todoManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="TODO 생성"
        description="학생별 과제를 손쉽게 생성하고 관리하여 학습 진도를 효율적으로 추적할 수 있는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="TODO 생성" reason="TODO 시스템 업데이트가 진행 중입니다." />
  }

  const result = await getStudentsMaster()

  return (
    <PageWrapper>
      <NewTodoForm studentsMaster={result.data} />
    </PageWrapper>
  )
}
