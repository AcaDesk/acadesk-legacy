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
import { ReportViewer } from '@/components/features/reports/ReportViewer'
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
        tenant_id,
        report_type,
        period_start,
        period_end,
        content,
        generated_at,
        students (
          id,
          student_code,
          grade,
          users (
            name,
            email
          )
        ),
        tenants (
          name,
          phone,
          email,
          address,
          website
        )
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
    // Extract tenant info for expired page
    const expiredReport = reportSend.reports as any
    const academyName = expiredReport?.tenants?.name || expiredReport?.content?.academy?.name || '학원'
    const academyPhone = expiredReport?.tenants?.phone || expiredReport?.content?.academy?.phone

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
    students?: {
      id: string
      student_code: string
      grade: string
      users?: {
        name: string
        email: string
      }
    }
    tenants?: {
      name: string
      phone: string | null
      email: string | null
      address: string | null
      website: string | null
    }
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

  // 5. Prepare data for ReportViewer
  const viewerData = {
    ...reportData,
    studentName: report.students?.users?.name || reportData.studentName,
    studentCode: report.students?.student_code || reportData.studentCode,
    grade: report.students?.grade || reportData.grade,
    academy: report.tenants ? {
      name: report.tenants.name,
      phone: report.tenants.phone,
      email: report.tenants.email,
      address: report.tenants.address,
      website: report.tenants.website,
    } : reportData.academy || {
      name: '학원',
      phone: null,
      email: null,
      address: null,
      website: null,
    },
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <ReportViewer
          reportData={viewerData}
          showEditButton={false}
        />

        {/* Footer - 공유 정보 */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center text-xs sm:text-sm text-muted-foreground space-y-1.5">
              <p>생성일: {new Date(report.generated_at).toLocaleDateString('ko-KR')}</p>
              {reportSend.recipient_name && (
                <p>이 리포트는 {reportSend.recipient_name} 님께 발송되었습니다.</p>
              )}
              {reportSend.link_expires_at && (
                <p className="text-[10px] sm:text-xs">
                  링크 만료일: {new Date(reportSend.link_expires_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
