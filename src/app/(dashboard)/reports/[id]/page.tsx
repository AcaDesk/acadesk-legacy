'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Separator } from '@ui/separator'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { Download, Send, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportData } from '@/core/types/report-entity'
import { ReportGrowthChart } from '@/components/features/reports/ReportGrowthChart'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface Report {
  id: string
  report_type: string
  period_start: string
  period_end: string
  content: ReportData
  generated_at: string
  sent_at: string | null
  students: {
    id: string
    student_code: string
    grade: string | null
    users: {
      name: string
      email: string | null
    } | null
  } | null
}

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  // All Hooks must be called before any early returns
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: report
      ? `${report.content.studentName || report.students?.users?.name || '학생'}_${new Date(report.period_start).getFullYear()}년_${new Date(report.period_start).getMonth() + 1}월_리포트`
      : 'report',
    onAfterPrint: () => {
      console.log('[ReportDetailPage] Print completed')
    },
  })

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadReport() {
    try {
      setLoading(true)

      const { data, error } = await supabase
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
        .eq('id', params.id)
        .single()

      if (error) throw error
      setReport(data as unknown as Report)
    } catch (error) {
      console.error('Error loading report:', error)
      toast({
        title: '로드 오류',
        description: '리포트를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSendClick() {
    setSendDialogOpen(true)
  }

  async function handleConfirmSend() {
    if (!report) return

    const studentName = report.content.studentName || report.students?.users?.name || '학생'

    setSending(true)
    try {
      // Dynamic import to avoid bundling server action in client
      const { sendReportToAllGuardians } = await import('@/app/actions/reports')

      const result = await sendReportToAllGuardians(params.id)

      if (!result.success) {
        throw new Error(result.error || '리포트 전송에 실패했습니다')
      }

      const { successCount, failCount } = result.data!

      toast({
        title: '전송 완료',
        description: `${studentName} 학생의 보호자 ${successCount}명에게 리포트가 전송되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
      })

      loadReport()
    } catch (error) {
      console.error('Error sending report:', error)
      toast({
        title: '전송 오류',
        description: error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
      setSendDialogOpen(false)
    }
  }

  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  function formatPeriod(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)

    return `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`
  }

  function getReportTypeLabel(type: string) {
    const types: Record<string, string> = {
      weekly: '주간',
      monthly: '월간',
      quarterly: '분기',
    }
    return types[type] || type
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 상세" description="학생별 월간 리포트를 상세하게 확인하고 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 상세" reason="리포트 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  if (!report) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">리포트를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/reports/list')}>목록으로 돌아가기</Button>
        </div>
      </PageWrapper>
    )
  }

  const reportData = report.content as any // Support both old and new format

  // Get academy info
  const academyName = reportData.academy?.name || '학원'
  const academyPhone = reportData.academy?.phone
  const academyEmail = reportData.academy?.email
  const academyAddress = reportData.academy?.address
  const academyWebsite = reportData.academy?.website

  // Get student info from either format
  const studentName = reportData.studentName || reportData.student?.name || report.students?.users?.name || '학생'
  const studentCode = reportData.studentCode || reportData.student?.student_code || report.students?.student_code || ''
  const studentGrade = reportData.grade || reportData.student?.grade || report.students?.grade || ''

  // Get attendance data from either format
  const attendanceRate = reportData.attendanceRate || reportData.attendance?.rate || 0
  const attendanceTotal = reportData.totalDays || reportData.attendance?.total || 0
  const attendancePresent = reportData.presentDays || reportData.attendance?.present || 0
  const attendanceLate = reportData.lateDays || reportData.attendance?.late || 0
  const attendanceAbsent = reportData.absentDays || reportData.attendance?.absent || 0

  // Get homework data from either format
  const homeworkRate = reportData.homeworkRate || reportData.homework?.rate || 0
  const homeworkTotal = reportData.totalTodos || reportData.homework?.total || 0
  const homeworkCompleted = reportData.completedTodos || reportData.homework?.completed || 0

  return (
    <PageWrapper
      title={`${getReportTypeLabel(report.report_type)} 리포트`}
      subtitle={formatPeriod(report.period_start, report.period_end)}
      actions={
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            PDF 다운로드
          </Button>
          {!report.sent_at && (
            <Button onClick={handleSendClick} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              보호자 전송
            </Button>
          )}
        </div>
      }
    >
      <div ref={contentRef} className="max-w-5xl mx-auto space-y-6">

        {/* Academy & Student Info Card */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* Academy Info */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-primary">{academyName}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {academyPhone && (
                    <span className="flex items-center gap-1">
                      📞 {academyPhone}
                    </span>
                  )}
                  {academyAddress && (
                    <span className="flex items-center gap-1">
                      📍 {academyAddress}
                    </span>
                  )}
                  {academyEmail && (
                    <span className="flex items-center gap-1">
                      ✉️ {academyEmail}
                    </span>
                  )}
                  {academyWebsite && (
                    <span className="flex items-center gap-1">
                      🌐 {academyWebsite}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Student Info */}
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {studentName} ({studentCode})
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {studentGrade} | {report.students?.users?.email || '이메일 없음'}
                  </CardDescription>
                </div>
                {report.sent_at && (
                  <Badge variant="outline">
                    전송 완료: {new Date(report.sent_at).toLocaleDateString('ko-KR')}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Growth Chart */}
        {reportData.chartPoints && reportData.chartPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>성장 추이</CardTitle>
              <CardDescription>최근 월별 성적, 출석률, 과제 완료율 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportGrowthChart chartPoints={reportData.chartPoints} />
            </CardContent>
          </Card>
        )}

        {/* Attendance & Homework Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>출석 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-blue-600 mb-4">
                {Math.round(attendanceRate)}%
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">총 출석일</span>
                  <span className="font-medium">{attendanceTotal}일</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">출석</span>
                  <span className="font-medium text-green-600">
                    {attendancePresent}일
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">지각</span>
                  <span className="font-medium text-yellow-600">
                    {attendanceLate}일
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">결석</span>
                  <span className="font-medium text-red-600">
                    {attendanceAbsent}일
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>과제 완료율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-green-600 mb-4">
                {Math.round(homeworkRate)}%
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">전체 과제</span>
                  <span className="font-medium">{homeworkTotal}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">완료</span>
                  <span className="font-medium text-green-600">
                    {homeworkCompleted}개
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">미완료</span>
                  <span className="font-medium text-red-600">
                    {homeworkTotal - homeworkCompleted}개
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scores by Category */}
        <Card>
          <CardHeader>
            <CardTitle>영역별 성적</CardTitle>
            <CardDescription>이번 기간 평균 점수 및 전월 대비 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {reportData.scores.map((score, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-semibold">{score.category}</h4>
                      {score.change !== null && (
                        <Badge variant={score.change > 0 ? 'default' : 'destructive'}>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(score.change)}
                            {Math.abs(score.change)}%
                          </div>
                        </Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold">{score.current}%</div>
                  </div>

                  {score.tests.length > 0 && (
                    <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                      {score.tests.map((test, testIdx) => (
                        <div key={testIdx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{test.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(test.date).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            <Badge variant="outline">{test.percentage}%</Badge>
                          </div>
                          {test.feedback && (
                            <p className="text-sm text-muted-foreground italic">
                              &quot;{test.feedback}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {idx < reportData.scores.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}

              {reportData.scores.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  이번 기간에 응시한 시험이 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructor Comment */}
        <Card>
          <CardHeader>
            <CardTitle>강사 코멘트</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {reportData.overallComment || reportData.instructorComment || '코멘트가 없습니다.'}
            </p>
          </CardContent>
        </Card>

        {/* Report Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              리포트 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일</span>
                <span className="font-medium">
                  {new Date(report.generated_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">전송일</span>
                <span className="font-medium">
                  {report.sent_at
                    ? new Date(report.sent_at).toLocaleString('ko-KR')
                    : '미전송'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Confirmation Dialog */}
      <ConfirmationDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        title="리포트를 전송하시겠습니까?"
        description={
          report
            ? `"${report.content.studentName || report.students?.users?.name || '학생'}" 학생의 보호자에게 리포트를 전송합니다.`
            : ''
        }
        confirmText="전송"
        variant="default"
        isLoading={sending}
        onConfirm={handleConfirmSend}
      />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          /* 페이지 브레이크 방지 */
          .space-y-6 > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* 카드 간격 조정 */
          .space-y-6 {
            gap: 1rem;
          }
        }
      `}</style>
    </PageWrapper>
  )
}
