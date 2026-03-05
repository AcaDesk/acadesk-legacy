import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Button } from '@ui/button'
import Link from 'next/link'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { ReportDetailContent } from './report-detail-content'

interface ReportSend {
  id: string
  recipient_name: string
  recipient_phone: string
  message_type: 'SMS' | 'LMS' | 'KAKAO'
  send_status: 'pending' | 'sent' | 'failed' | 'delivered'
  sent_at: string | null
  send_error: string | null
}

interface ReportRead {
  id: string
  report_send_id: string
  user_type: 'guardian' | 'student' | null
  read_at: string
  pdf_downloaded: boolean
  pdf_downloaded_at: string | null
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Feature flag checks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 상세" description="학생별 월간 리포트를 상세하게 확인하고 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 상세" reason="리포트 시스템 업데이트가 진행 중입니다." />;
  }

  // Verify staff access
  try {
    await verifyStaff()
  } catch {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">접근 권한이 없습니다.</p>
          <Button asChild>
            <Link href="/reports">목록으로 돌아가기</Link>
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const supabase = createServiceRoleClient()

  // Fetch report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select(`
      id,
      report_type,
      period_start,
      period_end,
      content,
      generated_at,
      sent_at,
      students (
        id,
        student_code,
        grade,
        users (
          name,
          email
        )
      )
    `)
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">리포트를 찾을 수 없습니다.</p>
          <Button asChild>
            <Link href="/reports">목록으로 돌아가기</Link>
          </Button>
        </div>
      </PageWrapper>
    )
  }

  // Fetch send history
  const { data: sendsData } = await supabase
    .from('report_sends')
    .select(`
      id,
      recipient_name,
      recipient_phone,
      message_type,
      send_status,
      sent_at,
      send_error
    `)
    .eq('report_id', id)
    .is('deleted_at', null)
    .order('sent_at', { ascending: false, nullsFirst: false })

  const reportSends = (sendsData || []) as ReportSend[]

  // Fetch read history (학부모 열람 기록) - 오류 시 빈 배열로 처리
  const { data: readsData } = await supabase
    .from('report_reads')
    .select('id, report_send_id, user_type, read_at, pdf_downloaded, pdf_downloaded_at')
    .eq('report_id', id)
    .order('read_at', { ascending: true })

  const reportReads = (readsData || []) as ReportRead[]

  return (
    <ReportDetailContent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialReport={report as any}
      initialReportSends={reportSends}
      initialReportReads={reportReads}
      reportId={id}
    />
  )
}
