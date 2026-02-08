'use client'

import { Card, CardContent } from '@ui/card'
import { ReportViewer } from './ReportViewer'
import type { ReportData } from '@/core/types/report.types'

interface ReportShareViewerProps {
  reportData: ReportData
  studentName: string
  studentCode: string
  studentGrade: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  recipientName?: string
  linkExpiresAt?: string | null
  academyName: string
  reportType?: string
}

// NOTE: PDF generation removed - see ReportPdfDocument.tsx if needed
// PDF download feature is disabled, so usePDF hook removed to save ~400KB bundle

export function ReportShareViewer(props: ReportShareViewerProps) {
  const currentYear = new Date().getFullYear()

  const viewerData = {
    ...props.reportData,
    academy: props.reportData.academy || {
      name: props.academyName,
      phone: null,
      email: null,
      address: null,
      website: null,
    },
  }

  // Format period dates
  const formatPeriodDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  }

  const periodStartFormatted = formatPeriodDate(props.periodStart)
  const periodEndFormatted = formatPeriodDate(props.periodEnd)

  return (
    <div className="min-h-screen bg-muted/20 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            {props.reportType === 'weekly' ? '주간' : props.reportType === 'quarterly' ? '분기' : '월간'} 리포트
          </h1>
          <p className="text-sm text-muted-foreground">{periodStartFormatted} ~ {periodEndFormatted}</p>
        </div>

        <ReportViewer
          reportData={viewerData}
          showEditButton={false}
        />

        <Card className="bg-muted/30 border-t-4 border-t-primary/20">
          <CardContent className="pt-6 pb-6">
            <div className="space-y-4">
              <div className="text-center text-xs sm:text-sm text-muted-foreground space-y-1.5 pb-4 border-b">
                <p className="font-medium">리포트 정보</p>
                <p>생성일: {new Date(props.generatedAt).toLocaleDateString('ko-KR')}</p>
                {props.recipientName && (
                  <p>수신자: {props.recipientName} 님</p>
                )}
                {props.linkExpiresAt && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground/80">
                    링크 만료일: {new Date(props.linkExpiresAt).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>

              <div className="text-center space-y-2">
                {viewerData.academy && (viewerData.academy.phone || viewerData.academy.email) && (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {viewerData.academy.phone && (
                      <span className="flex items-center gap-1">
                        📞 {viewerData.academy.phone}
                      </span>
                    )}
                    {viewerData.academy.email && (
                      <span className="flex items-center gap-1">
                        ✉️ {viewerData.academy.email}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/60">
                  &copy; {currentYear} {props.academyName}. All rights reserved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
