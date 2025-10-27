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
import { ReportShareViewer } from '@/components/features/reports/ReportShareViewer'
import type { ReportData } from '@/core/types/report.types'

interface PageProps {
  params: Promise<{ linkId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportSharePage({ params }: PageProps) {
  const { linkId } = await params

  const supabase = await createClient()

  // 1. share_link_id로 report_send 조회
  // Note: students, tenants JOIN은 RLS 문제로 제거
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
        tenant_id,
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

  console.log('[ReportSharePage] linkId:', linkId)
  console.log('[ReportSharePage] sendError:', sendError)
  console.log('[ReportSharePage] reportSend:', reportSend ? 'found' : 'not found')

  if (sendError) {
    console.error('[ReportSharePage] Query error:', sendError)
    notFound()
  }

  if (!reportSend) {
    console.error('[ReportSharePage] No report_send found for linkId:', linkId)
    notFound()
  }

  // 2. 링크 만료 확인
  if (reportSend.link_expires_at && new Date(reportSend.link_expires_at) < new Date()) {
    // Extract tenant info for expired page (content에서만 가져옴)
    const expiredReport = reportSend.reports as any
    const academyName = expiredReport?.content?.academy?.name || '학원'
    const academyPhone = expiredReport?.content?.academy?.phone

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-4">
            {/* Academy branding */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-primary">{academyName}</h2>
              {academyPhone && (
                <p className="text-sm text-muted-foreground mt-1">📞 {academyPhone}</p>
              )}
            </div>

            {/* Error message */}
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6 flex-shrink-0" />
                <CardTitle className="text-lg sm:text-xl">링크가 만료되었습니다</CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                요청하신 리포트 링크의 유효기간이 만료되었습니다.<br />
                {academyName}으로 문의하여 새로운 링크를 요청해 주세요.
              </CardDescription>
              {reportSend.link_expires_at && (
                <p className="text-xs text-muted-foreground">
                  만료일: {new Date(reportSend.link_expires_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
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
    console.error('[ReportSharePage] No report data in reportSend')
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

  // 5. Extract student info from report data
  const studentName = reportData.studentName || reportData.student?.name || '학생'
  const studentCode = reportData.studentCode || reportData.student?.student_code || ''
  const studentGrade = reportData.grade || reportData.student?.grade || ''
  const academyName = reportData.academy?.name || '학원'

  return (
    <ReportShareViewer
      reportData={reportData}
      studentName={studentName}
      studentCode={studentCode}
      studentGrade={studentGrade}
      periodStart={report.period_start}
      periodEnd={report.period_end}
      generatedAt={report.generated_at}
      recipientName={reportSend.recipient_name || undefined}
      linkExpiresAt={reportSend.link_expires_at}
      academyName={academyName}
    />
  )
}
