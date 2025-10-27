/**
 * Report Share Link View Page
 *
 * 공유 링크를 통한 리포트 열람 페이지
 * - 로그인 불필요
 * - share_link_id로 리포트 조회
 * - 열람 로그 기록
 */

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { AlertCircle } from 'lucide-react'
import { ReportPrintView } from '@/components/features/reports/ReportPrintView'
import type { ReportData } from '@/core/types/report.types'

interface PageProps {
  params: Promise<{ linkId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportSharePage({ params }: PageProps) {
  const { linkId } = await params

  const supabase = await createClient()

  // 1. share_link_id로 report_send 조회
  const { data: reportSend, error: sendError } = await supabase
    .from('report_sends')
    .select(`
      id,
      report_id,
      recipient_name,
      link_expires_at,
      send_status,
      reports (
        id,
        report_type,
        period_start,
        period_end,
        content,
        generated_at
      )
    `)
    .eq('share_link_id', linkId)
    .is('deleted_at', null)
    .maybeSingle()

  if (sendError || !reportSend) {
    notFound()
  }

  // 2. 링크 만료 확인
  if (reportSend.link_expires_at && new Date(reportSend.link_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">링크가 만료되었습니다</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              이 리포트 링크는 만료되었습니다. 학원에 문의하여 새로운 링크를 받아주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 3. 리포트 데이터 추출
  const report = reportSend.reports as unknown as {
    id: string
    tenant_id: string
    report_type: string
    period_start: string
    period_end: string
    content: ReportData
    generated_at: string
  }

  if (!report) {
    notFound()
  }

  const reportData: ReportData = report.content

  // 4. 열람 로그 기록
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null
    const userAgent = headersList.get('user-agent') || null
    const referrer = headersList.get('referer') || null

    await supabase.from('report_reads').insert({
      tenant_id: report.tenant_id,
      report_id: report.id,
      report_send_id: reportSend.id,
      user_id: null,
      user_type: null,
      read_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer: referrer,
      pdf_downloaded: false,
    })
  } catch (error) {
    console.error('[ReportSharePage] Error logging read:', error)
  }

  const periodStart = new Date(report.period_start)
  const periodEnd = new Date(report.period_end)

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <ReportPrintView
          reportData={reportData}
          reportType={report.report_type}
          periodStart={periodStart}
          periodEnd={periodEnd}
          generatedAt={report.generated_at}
          recipientName={reportSend.recipient_name}
          linkExpiresAt={reportSend.link_expires_at}
        />
      </div>
    </div>
  )
}
