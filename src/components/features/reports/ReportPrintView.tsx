/**
 * Report Print View Component
 *
 * PDF 다운로드/인쇄를 위한 리포트 뷰 컴포넌트
 * react-to-print를 사용하여 브라우저의 print 기능 활용
 */

'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { TodoCompletionDonut } from '@/components/features/charts/todo-completion-donut'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import type { ReportData } from '@/core/types/report.types'

interface ReportPrintViewProps {
  reportData: ReportData
  reportType: string
  periodStart: Date
  periodEnd: Date
  generatedAt: string
  recipientName?: string
  linkExpiresAt?: string | null
}

export function ReportPrintView({
  reportData,
  reportType,
  periodStart,
  periodEnd,
  generatedAt,
  recipientName,
  linkExpiresAt,
}: ReportPrintViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `${reportData.student.name}_${periodStart.getFullYear()}년_${periodStart.getMonth() + 1}월_리포트`,
    onAfterPrint: () => {
      console.log('[ReportPrintView] Print completed')
    },
  })

  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  return (
    <div>
      {/* Print Button (화면에만 표시, 인쇄 시 숨김) */}
      <div className="mb-6 print:hidden">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          PDF 다운로드
        </Button>
      </div>

      {/* Print Content */}
      <div ref={contentRef} className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {reportType === 'monthly' ? '월간' : '주간'} 리포트
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
              <div className="mt-2 text-muted-foreground">
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
              <p>생성일: {new Date(generatedAt).toLocaleDateString('ko-KR')}</p>
              {recipientName && (
                <p className="mt-2">이 리포트는 {recipientName} 님께 발송되었습니다.</p>
              )}
              {linkExpiresAt && (
                <p className="mt-1 text-xs">
                  링크 만료일: {new Date(linkExpiresAt).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
