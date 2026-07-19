export const dynamic = 'force-dynamic'

import { getBookLendings } from '@/app/actions/book-lendings'
import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { BookLendingsClient } from './book-lendings-client'

export default async function BookLendingsPage() {
  // Feature flag checks
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('libraryManagement')

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="도서 대출 관리"
        description="도서 대출 현황을 관리하고 연체 알림을 자동으로 전송할 수 있는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="도서 대출 관리"
        reason="도서 대출 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  // Fetch data on server
  const result = await getBookLendings()
  const lendings = result.success ? result.data : []

  return <BookLendingsClient initialLendings={lendings} />
}
