import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import {
  getConsultations,
  getConsultationStats,
  getConsultationFilterOptions,
} from '@/app/actions/consultations'
import { ConsultationsContent } from './consultations-content'

export default async function ConsultationsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.consultationManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="상담 관리"
        description="학부모 상담 일정을 체계적으로 관리하고, 상담 기록을 효율적으로 관리하는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="상담 관리"
        reason="상담 관리 시스템 개선 작업이 진행 중입니다."
      />
    )
  }

  // 병렬 fetch: 초기 데이터 + 통계 + 필터 옵션
  const [dataResult, statsResult, filterOptionsResult] = await Promise.all([
    getConsultations({ page: 1, pageSize: 20 }),
    getConsultationStats(),
    getConsultationFilterOptions(),
  ])

  return (
    <ConsultationsContent
      initialData={dataResult.success && dataResult.data ? (dataResult.data as any) : []}
      initialTotalCount={dataResult.success ? dataResult.totalCount : 0}
      initialStats={statsResult.success ? statsResult.data : null}
      filterOptions={filterOptionsResult.success ? filterOptionsResult.data : null}
    />
  )
}
