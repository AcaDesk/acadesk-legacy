'use client'

import { useEffect } from 'react'
import { usePDF } from '@react-pdf/renderer'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ReportViewer } from './ReportViewer'
import { ReportPdfDocument } from './ReportPdfDocument'
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
}

export function ReportShareViewer(props: ReportShareViewerProps) {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()

  const [instance, updatePdf] = usePDF({
    document: (
      <ReportPdfDocument
        reportData={props.reportData}
        studentName={props.studentName}
        studentCode={props.studentCode}
        studentGrade={props.studentGrade}
        periodStart={props.periodStart}
        periodEnd={props.periodEnd}
        generatedAt={props.generatedAt}
      />
    ),
  })

  useEffect(() => {
    updatePdf(
      <ReportPdfDocument
        reportData={props.reportData}
        studentName={props.studentName}
        studentCode={props.studentCode}
        studentGrade={props.studentGrade}
        periodStart={props.periodStart}
        periodEnd={props.periodEnd}
        generatedAt={props.generatedAt}
      />
    )
  }, [updatePdf, props])

  function handlePdfDownload() {
    if (!instance.blob || instance.loading) return

    const link = document.createElement('a')
    link.href = URL.createObjectURL(instance.blob)
    const year = new Date(props.periodStart).getFullYear()
    const month = new Date(props.periodStart).getMonth() + 1
    const fileName = `${props.studentName}_${year}년_${month}월_리포트.pdf`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    toast({
      title: 'PDF 다운로드 완료',
      description: `${props.studentName} 학생의 리포트가 다운로드되었습니다.`,
    })
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">월간 리포트</h1>
          <p className="text-sm text-muted-foreground">{periodStartFormatted} ~ {periodEndFormatted}</p>
        </div>

        {/* PDF 다운로드 기능 임시 비활성화 */}
        {/* <div className="flex justify-end print:hidden">
          <Button
            variant="outline"
            onClick={handlePdfDownload}
            disabled={instance.loading || !instance.blob}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {instance.loading ? 'PDF 생성 중...' : 'PDF 다운로드'}
          </Button>
        </div> */}

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
