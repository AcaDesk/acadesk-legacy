/**
 * Public Report Viewer Page
 *
 * 공개 리포트 뷰어 페이지 (인증 불필요)
 * - 링크형 리포트 전략: UUID 기반 난수 링크로 접근
 * - 모바일 최적화
 */

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Report } from '@core/domain/entities/Report'
import { ReportViewerContent } from '@/components/features/reports/ReportViewerContent'

interface PageProps {
  params: Promise<{
    reportId: string
  }>
}

export default async function PublicReportViewerPage({ params }: PageProps) {
  const { reportId } = await params

  // Service role client로 공개 리포트 조회 (RLS 우회)
  const supabase = createServiceRoleClient()

  const { data: reportRow, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !reportRow) {
    console.error('[PublicReportViewer] Report not found:', reportId)
    notFound()
  }

  // Report 엔티티로 변환
  const report = Report.fromDatabase(reportRow)

  return <ReportViewerContent report={report} />
}
