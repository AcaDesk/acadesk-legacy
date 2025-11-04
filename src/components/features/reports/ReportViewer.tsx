'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { TrendingUp, TrendingDown, Minus, Edit2 } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import { formatKoreanDateShort } from '@/lib/utils'
import type { ReportData } from '@/core/types/report.types'

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

export function ReportViewer({ reportData, onEditComment, showEditButton = false }: ReportViewerProps) {
  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  // 데이터 호환성 처리
  const studentName = reportData.studentName || reportData.student?.name || '학생'
  const studentCode = reportData.studentCode || reportData.student?.student_code || ''
  const grade = reportData.grade || reportData.student?.grade || ''

  const attendanceRate = reportData.attendanceRate ?? reportData.attendance?.rate ?? 0
  const totalDays = reportData.totalDays ?? reportData.attendance?.total ?? 0
  const presentDays = reportData.presentDays ?? reportData.attendance?.present ?? 0
  const lateDays = reportData.lateDays ?? reportData.attendance?.late ?? 0
  const absentDays = reportData.absentDays ?? reportData.attendance?.absent ?? 0

  const homeworkRate = reportData.homeworkRate ?? reportData.homework?.rate ?? 0
  const totalTodos = reportData.totalTodos ?? reportData.homework?.total ?? 0
  const completedTodos = reportData.completedTodos ?? reportData.homework?.completed ?? 0

  // Format comment for display
  function getFormattedComment(): string {
    // Use new structured format if available
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

    // Fallback to legacy formats
    return (
      reportData.overallComment ||
      reportData.instructorComment ||
      '코멘트가 없습니다.\n"코멘트 수정" 버튼을 클릭하여 구조화된 피드백을 작성해보세요.'
    )
  }

  // Radial bar data for attendance
  const attendanceRadialData = [
    {
      name: '출석률',
      value: attendanceRate,
      fill: 'hsl(var(--primary))',
    },
  ]

  // Radial bar data for homework
  const homeworkRadialData = [
    {
      name: '과제 달성률',
      value: homeworkRate,
      fill: 'hsl(142.1 76.2% 36.3%)', // green-600
    },
  ]

  // Extract year and month from period for AttendanceHeatmap
  const periodEnd = reportData.period ? new Date(reportData.period.end) : new Date()
  const calendarYear = periodEnd.getFullYear()
  const calendarMonth = periodEnd.getMonth() + 1 // 0-based to 1-based

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

      {/* Section 1: Subject Score Table (과목별 점수 - 모바일 친화적) */}
      {reportData.scores && reportData.scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">이번 달 시험 성적</CardTitle>
            <CardDescription>과목별 점수 및 총점</CardDescription>
          </CardHeader>
          <CardContent>
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
                        <span className="text-2xl font-bold text-primary">{score.current}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
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
                      <span className="text-3xl font-bold text-primary">
                        {Math.round(
                          reportData.scores.reduce((sum, s) => sum + s.current, 0) /
                          reportData.scores.length
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      {(() => {
                        const validChanges = reportData.scores.filter(s => s.change !== null)
                        if (validChanges.length === 0) return <span className="text-sm text-muted-foreground">-</span>
                        const avgChange = validChanges.reduce((sum, s) => sum + (s.change || 0), 0) / validChanges.length
                        return (
                          <Badge
                            variant={avgChange > 0 ? 'default' : avgChange < 0 ? 'destructive' : 'secondary'}
                            className="text-base font-semibold"
                          >
                            <div className="flex items-center gap-1">
                              {getTrendIcon(avgChange)}
                              {Math.abs(Math.round(avgChange * 10) / 10)}
                            </div>
                          </Badge>
                        )
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: At-a-Glance (한눈에 보기) */}
      {/* 임시 숨김: 이번 달 평균 점수, 반평균, 출석률, 과제 달성률 KPI 카드 */}
      {/* {reportData.currentScore && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">이번 달 평균 점수</CardDescription>
              <CardTitle className="text-3xl font-bold text-primary">
                {reportData.currentScore.myScore}점
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">반 평균 점수</CardDescription>
              <CardTitle className="text-3xl font-bold text-muted-foreground">
                {reportData.currentScore.classAverage}점
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">출석률</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {Math.round(attendanceRate)}%
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">과제 달성률</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {Math.round(homeworkRate)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )} */}

      {/* Section 2-1: 과목별 점수 KPI 카드 */}
      {reportData.scores && reportData.scores.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 평균 점수 카드 */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">이번달 평균</CardDescription>
              <CardTitle className="text-3xl font-bold text-primary">
                {Math.round(
                  reportData.scores.reduce((sum, s) => sum + (s.current || 0), 0) /
                  reportData.scores.length
                )}점
              </CardTitle>
              {(() => {
                const validChanges = reportData.scores.filter(s => s.change !== null)
                if (validChanges.length === 0) return null
                const avgChange = validChanges.reduce((sum, s) => sum + (s.change || 0), 0) / validChanges.length
                return (
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(avgChange)}
                    <span className={`text-sm font-medium ${
                      avgChange > 0 ? 'text-green-600' :
                      avgChange < 0 ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {avgChange > 0 ? '+' : ''}{Math.round(avgChange * 10) / 10}점
                    </span>
                  </div>
                )
              })()}
            </CardHeader>
          </Card>

          {/* 과목별 점수 카드 */}
          {reportData.scores.map((score, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{score.category}</CardDescription>
                <CardTitle className="text-3xl font-bold text-primary">
                  {score.current}점
                </CardTitle>
                {score.change !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(score.change)}
                    <span className={`text-sm font-medium ${
                      score.change > 0 ? 'text-green-600' :
                      score.change < 0 ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {score.change > 0 ? '+' : ''}{score.change}점
                    </span>
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Section 3: Score Trend (성적 분석) - 과목별 막대그래프 */}
      {reportData.scores && reportData.scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>과목별 성적</CardTitle>
            <CardDescription>
              이번달 과목별 점수 및 평균입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  ...reportData.scores.map((score) => ({
                    name: score.category,
                    점수: score.current,
                  })),
                  {
                    name: '평균',
                    점수: Math.round(
                      reportData.scores.reduce((sum, s) => sum + (s.current || 0), 0) /
                      reportData.scores.length
                    ),
                  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
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

      {/* Section 4: Learning Status (학습 현황) */}
      <div className="space-y-6">
        {/* Attendance Calendar Heatmap */}
        {reportData.attendanceChartData && reportData.attendanceChartData.length > 0 && (
          <AttendanceHeatmap
            data={reportData.attendanceChartData}
            title="출석 현황"
            description="월별 출석 캘린더"
            year={calendarYear}
            month={calendarMonth}
          />
        )}

        {/* 임시 숨김: 과제 달성률 차트 */}
        {/* <Card>
          <CardHeader>
            <CardTitle>과제 달성률</CardTitle>
            <CardDescription>이번 달 과제 완료 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="70%"
                  outerRadius="100%"
                  barSize={20}
                  data={homeworkRadialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    background={{ fill: 'hsl(var(--muted))' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold"
                    style={{ fill: 'hsl(142.1 76.2% 36.3%)' }}
                  >
                    {Math.round(homeworkRate)}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                총 {totalTodos}개 중 {completedTodos}개 완료
              </p>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Detailed Scores by Category */}
      {reportData.scores && reportData.scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>과목별 상세 성적</CardTitle>
            <CardDescription>시험별 점수 내역 및 반 평균 비교</CardDescription>
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
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold">{score.current}%</div>
                        {score.average !== null && (
                          <div className="text-xs text-muted-foreground">
                            반 평균: {score.average}%
                          </div>
                        )}
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
                            <span className="text-muted-foreground">
                              {formatKoreanDateShort(test.date)}
                            </span>{' '}
                            - {test.name}
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
      )}

      {/* Section 5: Instructor Comment (강사 종합 코멘트) */}
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
