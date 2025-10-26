'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { TrendingUp, TrendingDown, Minus, Edit2 } from 'lucide-react'
import {
  LineChart,
  Line,
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
      current: number
      previous: number | null
      change: number | null
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
      '내 점수': number
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

      {/* Section 1: At-a-Glance (한눈에 보기) */}
      {reportData.currentScore && (
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
      )}

      {/* Section 2: Score Trend (성적 분석) */}
      {reportData.scoreTrend && reportData.scoreTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>월간 성적 분석</CardTitle>
            <CardDescription>
              최근 3개월간 학생의 점수와 반 평균 점수 추이입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="내 점수"
                  strokeWidth={2}
                  stroke="hsl(var(--primary))"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="반 평균"
                  strokeWidth={2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Learning Status (학습 현황) */}
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

        {/* Homework Completion Chart */}
        <Card>
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
        </Card>
      </div>

      {/* Scores by Category */}
      {reportData.scores && reportData.scores.length > 0 && (
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

      {/* Section 4: Instructor Comment (강사 종합 코멘트) */}
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
