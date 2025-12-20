import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { ReportTemplatesClient } from './report-templates-client'
import { getTenantReportTemplates, getSystemReportTemplates } from '@/app/actions/report-templates'
import type { Metadata } from 'next'

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

  // Debug logging
  if (!tenantResult.success) {
    console.error('[ReportTemplatesPage] Tenant templates error:', tenantResult.error)
  }
  if (!systemResult.success) {
    console.error('[ReportTemplatesPage] System templates error:', systemResult.error)
  }

  const tenantTemplates = tenantResult.success && tenantResult.data ? tenantResult.data : []
  const systemTemplates = systemResult.success && systemResult.data ? systemResult.data : []

  console.log('[ReportTemplatesPage] Loaded templates:', {
    tenantCount: tenantTemplates.length,
    systemCount: systemTemplates.length,
  })

  return (
    <PageWrapper>
      <ReportTemplatesClient
        tenantTemplates={tenantTemplates}
        systemTemplates={systemTemplates}
      />
    </PageWrapper>
  )
}
