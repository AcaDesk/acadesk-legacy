import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { ReportTemplatesClient } from './report-templates-client'
import { getTenantReportTemplates, getSystemReportTemplates } from '@/app/actions/report-templates'
import type { Metadata } from 'next'

// 캐싱 비활성화 - 항상 최신 데이터 fetch
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '리포트 템플릿 관리',
  description: '리포트 코멘트 작성 시 사용할 템플릿을 관리합니다.',
}

export default async function ReportTemplatesPage() {
  // Verify authentication
  await requireAuth()

  // Fetch templates from database
  const [tenantResult, systemResult] = await Promise.all([
    getTenantReportTemplates(),
    getSystemReportTemplates(),
  ])

  const tenantTemplates = tenantResult.success && tenantResult.data ? tenantResult.data : []
  const systemTemplates = systemResult.success && systemResult.data ? systemResult.data : []

  return (
    <PageWrapper>
      <ReportTemplatesClient
        tenantTemplates={tenantTemplates}
        systemTemplates={systemTemplates}
      />
    </PageWrapper>
  )
}
