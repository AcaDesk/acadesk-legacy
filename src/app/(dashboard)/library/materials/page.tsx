import { getBooks } from '@/app/actions/books'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { MaterialsClient } from './materials-client'

export default async function LibraryMaterialsPage() {
  const featureStatus = FEATURES.libraryManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="도서 목록 관리"
        description="도서 목록 조회와 일괄 등록 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="도서 목록 관리"
        reason="도서 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  const result = await getBooks()
  const books = result.success ? result.data : []

  return <MaterialsClient initialBooks={books} />
}
