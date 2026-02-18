'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/accordion'
import { TrendingUp, TrendingDown, Minus, Edit2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import { formatKoreanDateShort } from '@/lib/utils'

interface ReportViewerProps {
  reportData: {
    studentName?: string
    studentCode?: string
    grade?: string
    student?: {
      name: string
      student_code: string
      grade: string
    }
    academy: {
      name: string
      phone: string | null
      email: string | null
      address: string | null
      website: string | null
    }
    period: {
      start: string
      end: string
    }
    attendance: {
      total: number
      present: number
      late: number
      absent: number
      rate: number
    }
    homework: {
      total: number
      completed: number
      rate: number
    }
    scores: {
      category: string
      current: number | null
      previous: number | null
      change: number | null
      average: number | null
      retestRate: number | null
      tests: Array<{
        name: string
        date: string
        percentage: number
        feedback: string | null
      }>
    }[]
    // New structured comment format
    comment?: {
      summary: string
      strengths: string
      improvements: string
      nextGoals: string
    }
    // Legacy comment fields
    instructorComment?: string
    overallComment?: string
    // New visualization data
    currentScore?: {
      myScore: number
      classAverage: number
      highestScore: number
    }
    scoreTrend?: Array<{
      name: string
      '학생 점수': number
      '반 평균': number
    }>
    gradesChartData?: Array<{
      examName: string
      score: number
      classAverage?: number
      date?: string
    }>
    attendanceChartData?: Array<{
      date: Date
      status: 'present' | 'late' | 'absent' | 'none'
      note?: string
    }>
    attendanceRate?: number
    totalDays?: number
    presentDays?: number
    lateDays?: number
    absentDays?: number
    homeworkRate?: number
    totalTodos?: number
    completedTodos?: number
  }
  onEditComment?: () => void
  showEditButton?: boolean
}

const CustomAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const { value } = payload;

  const words = String(value).split(' ');

  if (words.length === 1 || !value) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
          {value}
        </text>
      </g>
    );
  }

  const line1 = words[0];
  const line2 = words.slice(1).join(' ');

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
        <tspan x={0} dy="0em">{line1}</tspan>
        <tspan x={0} dy="1.2em">{line2}</tspan>
      </text>
    </g>
  );
};

export function ReportViewer({ reportData, onEditComment, showEditButton = false }: ReportViewerProps) {
  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  // 데이터 호환성 처리
  const studentName = reportData.studentName || reportData.student?.name || '학생'
  const studentCode = reportData.studentCode || reportData.student?.student_code || ''
  const grade = reportData.grade || reportData.student?.grade || ''

  const attendanceRate = reportData.attendanceRate ?? reportData.attendance?.rate ?? 0
  const homeworkRate = reportData.homeworkRate ?? reportData.homework?.rate ?? 0

  // 평균 점수 계산
  const averageScore = reportData.scores?.length > 0
    ? Math.round(reportData.scores.reduce((sum, s) => sum + (s.current || 0), 0) / reportData.scores.length)
    : null
  const avgChange = (() => {
    if (!reportData.scores?.length) return null
    const validChanges = reportData.scores.filter(s => s.change !== null)
    if (validChanges.length === 0) return null
    return Math.round(validChanges.reduce((sum, s) => sum + (s.change || 0), 0) / validChanges.length * 10) / 10
  })()

  // Format comment for display
  function getFormattedComment(): string {
    if (reportData.comment) {
      return `📝 총평
${reportData.comment.summary}

✨ 잘한 점
${reportData.comment.strengths}

📈 보완할 점
${reportData.comment.improvements}

🎯 다음 달 목표
${reportData.comment.nextGoals}`
    }

    return (
      reportData.overallComment ||
      reportData.instructorComment ||
      '코멘트가 없습니다.\n"코멘트 수정" 버튼을 클릭하여 구조화된 피드백을 작성해보세요.'
    )
  }

  // 날짜 안전 포맷
  function safeDateFormat(dateStr: string | undefined | null): string | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return formatKoreanDateShort(dateStr)
  }

  // Extract year and month from period for AttendanceHeatmap
  const periodEnd = reportData.period ? new Date(reportData.period.end) : new Date()
  const calendarYear = periodEnd.getFullYear()
  const calendarMonth = periodEnd.getMonth() + 1

  return (
    <div className="space-y-6">
      {/* Academy & Student Info Card */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* Academy Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary">{reportData.academy.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {reportData.academy.phone && (
                  <span className="flex items-center gap-1">
                    📞 {reportData.academy.phone}
                  </span>
                )}
                {reportData.academy.address && (
                  <span className="flex items-center gap-1">
                    📍 {reportData.academy.address}
                  </span>
                )}
                {reportData.academy.email && (
                  <span className="flex items-center gap-1">
                    ✉️ {reportData.academy.email}
                  </span>
                )}
              </div>
            </div>
            <Separator />
            {/* Student Info */}
            <div>
              <CardTitle>
                {studentName} {studentCode && `(${studentCode})`}
              </CardTitle>
              <CardDescription>
                {grade}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards: 평균점수, 출석률, 과제율 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 평균 점수 */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">평균 점수</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {averageScore !== null ? `${averageScore}점` : '-'}
            </CardTitle>
            {avgChange !== null && (
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(avgChange)}
                <span className={`text-sm font-medium ${
                  avgChange > 0 ? 'text-success' :
                  avgChange < 0 ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {avgChange > 0 ? '+' : ''}{avgChange}점
                </span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* 출석률 */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">출석률</CardDescription>
            <CardTitle className="text-3xl font-bold text-info">
              {Math.round(attendanceRate)}%
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.attendance.present}/{reportData.attendance.total}일
            </p>
          </CardHeader>
        </Card>

        {/* 과제 달성률 */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">과제 달성률</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">
              {Math.round(homeworkRate)}%
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.homework.completed}/{reportData.homework.total}개
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Bar Chart: 과목별 성적 */}
      {reportData.scores && reportData.scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>과목별 성적</CardTitle>
            <CardDescription>
              이번달 과목별 점수 및 평균입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  ...reportData.scores.map((score) => ({
                    name: score.category,
                    점수: score.current ?? 0,
                  })),
                  {
                    name: '평균',
                    점수: averageScore ?? 0,
                  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={<CustomAxisTick />}
                    height={30}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="점수"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                <span className="text-xs text-muted-foreground">점수</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Heatmap */}
      {reportData.attendanceChartData && reportData.attendanceChartData.length > 0 && (
        <AttendanceHeatmap
          data={reportData.attendanceChartData}
          title="출석 현황"
          description="월별 출석 캘린더"
          year={calendarYear}
          month={calendarMonth}
          compact
        />
      )}

      {/* Accordion: 성적 상세 */}
      {reportData.scores && reportData.scores.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" className="w-full">
              {/* 과목별 점수 표 */}
              <AccordionItem value="score-table">
                <AccordionTrigger className="text-base font-semibold">
                  과목별 점수 상세
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="py-3 px-2 text-left font-semibold text-sm">과목</th>
                          <th className="py-3 px-2 text-center font-semibold text-sm">점수</th>
                          <th className="py-3 px-2 text-center font-semibold text-sm">전월 대비</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.scores.map((score, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="py-3 px-2 font-medium">{score.category}</td>
                            <td className="py-3 px-2 text-center">
                              {score.current !== null ? (
                                <>
                                  <span className="text-2xl font-bold text-primary">{score.current}</span>
                                  <span className="text-sm text-muted-foreground">/100</span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {score.change !== null ? (
                                <Badge
                                  variant={score.change > 0 ? 'default' : score.change < 0 ? 'destructive' : 'secondary'}
                                  className="text-base font-semibold"
                                >
                                  <div className="flex items-center gap-1">
                                    {getTrendIcon(score.change)}
                                    {Math.abs(score.change)}
                                  </div>
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {/* TOTAL Row */}
                        <tr className="bg-muted/50 font-bold">
                          <td className="py-4 px-2 text-lg">TOTAL</td>
                          <td className="py-4 px-2 text-center">
                            {averageScore !== null ? (
                              <>
                                <span className="text-3xl font-bold text-primary">{averageScore}</span>
                                <span className="text-sm text-muted-foreground">/100</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-4 px-2 text-center">
                            {avgChange !== null ? (
                              <Badge
                                variant={avgChange > 0 ? 'default' : avgChange < 0 ? 'destructive' : 'secondary'}
                                className="text-base font-semibold"
                              >
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(avgChange)}
                                  {Math.abs(avgChange)}
                                </div>
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 과목별 상세 성적 */}
              <AccordionItem value="score-detail">
                <AccordionTrigger className="text-base font-semibold">
                  과목별 시험 상세
                </AccordionTrigger>
                <AccordionContent>
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
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {score.current !== null ? `${score.current}%` : '-'}
                              </div>
                              {score.retestRate !== null && score.retestRate > 0 && (
                                <div className="text-xs text-orange-600">
                                  재시험률: {score.retestRate}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {score.tests.length > 0 && (
                          <div className="ml-4 space-y-2">
                            {score.tests.map((test, testIdx) => (
                              <div
                                key={testIdx}
                                className="flex items-center justify-between text-sm"
                              >
                                <div>
                                  {(() => {
                                    const formatted = safeDateFormat(test.date)
                                    return formatted ? (
                                      <>
                                        <span className="text-muted-foreground">
                                          {formatted}
                                        </span>{' '}
                                        -{' '}
                                      </>
                                    ) : null
                                  })()}
                                  {test.name}
                                </div>
                                <div className="font-medium">
                                  {test.percentage !== null ? `${test.percentage}%` : (
                                    <span className="text-muted-foreground">미입력</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {idx < reportData.scores.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Instructor Comment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>강사 종합 코멘트</CardTitle>
              <CardDescription className="mt-1">
                학생의 성장을 위한 맞춤형 피드백
              </CardDescription>
            </div>
            {showEditButton && onEditComment && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditComment}
                className="print:hidden"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                코멘트 수정
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reportData.comment ? (
            <div className="space-y-6">
              {/* 1. 총평 */}
              <div>
                <h4 className="flex items-center font-semibold mb-2 text-base">
                  <span className="text-xl mr-2">📝</span> 총평
                </h4>
                <p className="text-muted-foreground leading-relaxed ml-7">
                  {reportData.comment.summary || '코멘트가 없습니다.'}
                </p>
              </div>

              <Separator />

              {/* 2. 잘한 점 */}
              <div>
                <h4 className="flex items-center font-semibold mb-2 text-base">
                  <span className="text-xl mr-2">✨</span> 잘한 점
                </h4>
                <p className="text-muted-foreground leading-relaxed ml-7">
                  {reportData.comment.strengths || '코멘트가 없습니다.'}
                </p>
              </div>

              <Separator />

              {/* 3. 보완할 점 */}
              <div>
                <h4 className="flex items-center font-semibold mb-2 text-base">
                  <span className="text-xl mr-2">📈</span> 보완할 점
                </h4>
                <p className="text-muted-foreground leading-relaxed ml-7">
                  {reportData.comment.improvements || '코멘트가 없습니다.'}
                </p>
              </div>

              <Separator />

              {/* 4. 다음 달 목표 */}
              <div>
                <h4 className="flex items-center font-semibold mb-2 text-base">
                  <span className="text-xl mr-2">🎯</span> 다음 달 목표
                </h4>
                <p className="text-muted-foreground leading-relaxed ml-7">
                  {reportData.comment.nextGoals || '코멘트가 없습니다.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {getFormattedComment()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
