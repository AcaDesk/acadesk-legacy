export const dynamic = 'force-dynamic'

import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getBookLendingFormOptions } from '@/app/actions/book-lendings'
import { NewLendingClient } from './new-lending-client'

export default async function NewBookLendingPage() {
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('libraryManagement')

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="도서 대출 등록"
        description="학생별 교재 대출 등록 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="도서 대출 등록"
        reason="대출 등록 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  const result = await getBookLendingFormOptions()
  const students = result.success ? result.data.students : []
  const textbooks = result.success ? result.data.textbooks : []

  return <NewLendingClient students={students} textbooks={textbooks} />
}
