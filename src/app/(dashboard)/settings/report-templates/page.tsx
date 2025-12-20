import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { ReportTemplatesClient } from './report-templates-client'
import { getTenantReportTemplates, getSystemReportTemplates } from '@/app/actions/report-templates'
import type { Metadata } from 'next'

// ISR: 60초마다 재생성 + 서버 액션에서 revalidatePath로 즉시 갱신
export const revalidate = 60

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

  // 권한 에러 체크
  const error = tenantResult.error || systemResult.error
  if (error) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              접근 권한이 없습니다
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error}
            </p>
            <p className="text-xs text-muted-foreground">
              원장 또는 강사 계정으로 로그인해주세요.
            </p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  const tenantTemplates = tenantResult.data ?? []
  const systemTemplates = systemResult.data ?? []

  return (
    <PageWrapper>
      <ReportTemplatesClient
        tenantTemplates={tenantTemplates}
        systemTemplates={systemTemplates}
      />
    </PageWrapper>
  )
}
