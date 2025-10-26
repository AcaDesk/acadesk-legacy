'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Button } from '@ui/button'
import { TrendingUp, TrendingDown, Minus, Edit2 } from 'lucide-react'
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
    instructorComment?: string
    overallComment?: string
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

      {/* Attendance & Homework KPIs */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>출석률</CardTitle>
            <CardDescription>이번 달 출석 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {Math.round(attendanceRate)}%
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              출석: {presentDays}일 / 지각: {lateDays}일 / 결석: {absentDays}일
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              총 수업일: {totalDays}일
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>과제 완료율</CardTitle>
            <CardDescription>이번 달 과제 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {Math.round(homeworkRate)}%
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              완료: {completedTodos}개 / 전체: {totalTodos}개
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
      )}

      {/* Instructor Comment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>강사 코멘트</CardTitle>
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
          <CardDescription>
            학생의 성장을 위한 맞춤형 피드백
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {reportData.overallComment || reportData.instructorComment || '코멘트가 없습니다.\n"코멘트 수정" 버튼을 클릭하여 구조화된 피드백을 작성해보세요.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
