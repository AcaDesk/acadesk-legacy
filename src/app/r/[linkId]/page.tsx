/**
 * Report Share Link View Page
 *
 * 공유 링크를 통한 리포트 열람 페이지
 * - 로그인 불필요
 * - share_link_id로 리포트 조회
 * - 열람 로그 기록
 */

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { Download, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { TodoCompletionDonut } from '@/components/features/charts/todo-completion-donut'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>링크가 만료되었습니다</CardTitle>
            </div>
            <CardDescription>
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
      tenant_id: reportSend.reports?.tenant_id,
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

  // Helper function for trend icons
  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  const periodStart = new Date(report.period_start)
  const periodEnd = new Date(report.period_end)

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {report.report_type === 'monthly' ? '월간' : '주간'} 리포트
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {reportData.student.name} 님
                  </span>
                </div>
                <CardTitle className="text-2xl">
                  {reportData.student.name} ({reportData.student.student_code})
                </CardTitle>
                <CardDescription>
                  {reportData.student.grade} |{' '}
                  {periodStart.getFullYear()}년 {periodStart.getMonth() + 1}월{' '}
                  {periodStart.getDate()}일 ~ {periodEnd.getMonth() + 1}월{' '}
                  {periodEnd.getDate()}일
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                PDF 다운로드
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Charts Section */}
        <div className="space-y-6">
          {/* Grades Chart */}
          {reportData.gradesChartData.length > 0 && (
            <GradesLineChart
              data={reportData.gradesChartData}
              title="성적 추이"
              description="시험별 점수 변화"
              showClassAverage={true}
            />
          )}

          {/* Attendance & Todo Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Attendance Heatmap */}
            <AttendanceHeatmap
              data={reportData.attendanceChartData}
              title="출석 현황"
              description="월별 출석 캘린더"
              year={periodStart.getFullYear()}
              month={periodStart.getMonth() + 1}
            />

            {/* Todo Completion Donut */}
            <TodoCompletionDonut
              data={{
                completed: reportData.homework.completed,
                incomplete: reportData.homework.total - reportData.homework.completed,
              }}
              title="과제 완료율"
              description="완료 vs 미완료 비율"
            />
          </div>
        </div>

        {/* Attendance & Homework */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>출석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {reportData.attendance.rate}%
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                출석: {reportData.attendance.present} / 지각: {reportData.attendance.late} /
                결석: {reportData.attendance.absent}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>숙제 완료율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {reportData.homework.rate}%
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                완료: {reportData.homework.completed} / 전체: {reportData.homework.total}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scores by Category */}
        <Card>
          <CardHeader>
            <CardTitle>영역별 성적</CardTitle>
            <CardDescription>이번 달 평균 점수 및 전월 대비 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.scores.map((score, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{score.category}</h4>
                      {score.change !== null && (
                        <Badge variant={score.change > 0 ? 'default' : 'destructive'}>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(score.change)}
                            {Math.abs(score.change)}%
                          </div>
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold">{score.current}%</div>
                  </div>

                  {score.tests.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {score.tests.map((test, testIdx) => (
                        <div
                          key={testIdx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="text-muted-foreground">{test.date}</span> -{' '}
                            {test.name}
                          </div>
                          <div className="font-medium">{test.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {idx < reportData.scores.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructor Comment */}
        <Card>
          <CardHeader>
            <CardTitle>강사 코멘트</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {reportData.instructorComment}
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>생성일: {new Date(report.generated_at).toLocaleDateString('ko-KR')}</p>
              <p className="mt-2">
                이 리포트는 {reportSend.recipient_name} 님께 발송되었습니다.
              </p>
              {reportSend.link_expires_at && (
                <p className="mt-1 text-xs">
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
