import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import {
  getConsultations,
} from '@/app/actions/consultations'
import { ConsultationsContent } from './consultations-content'

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Feature flag checks
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('consultationManagement')

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

  // URL searchParams에서 초기 필터/페이지 상태 읽기
  const params = await searchParams
  const page = Number(params.page) || 1
  const tab = (params.tab as string) || 'all'
  const type = (params.type as string) || undefined
  const conductor = (params.conductor as string) || undefined
  const followUp = (params.followUp as string) || undefined
  const startDate = (params.startDate as string) || undefined
  const endDate = (params.endDate as string) || undefined
  const search = (params.search as string) || undefined

  const dataResult = await getConsultations({
    page,
    pageSize: 20,
    isLead: tab === 'all' ? undefined : tab === 'lead',
    consultationType: type,
    conductedBy: conductor,
    followUpOnly: followUp === 'required' ? true : undefined,
    startDate,
    endDate,
    searchTerm: search,
  })

  return (
    <ConsultationsContent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialData={dataResult.success && dataResult.data ? (dataResult.data as any) : []}
      initialTotalCount={dataResult.success ? dataResult.totalCount : 0}
      initialStats={null}
      filterOptions={null}
      upcomingFollowUps={[]}
    />
  )
}
