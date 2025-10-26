'use client'

import { useState, useEffect } from 'react'
import { generateMonthlyReport, saveReport, getStudentsForReport } from '@/app/actions/reports'
import type { ReportData } from '@/core/types/report.types'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { useToast } from '@/hooks/use-toast'
import { FileText, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { TodoCompletionDonut } from '@/components/features/charts/todo-completion-donut'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

export default function ReportsPage() {
  // All Hooks must be called before any early returns
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [generating, setGenerating] = useState(false)

  const { toast } = useToast()

  const years = [2024, 2025, 2026]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStudents() {
    try {
      const result = await getStudentsForReport()

      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록 조회 실패')
      }

      setStudents(result.data as unknown as Student[])
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '데이터 로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function generateReport() {
    if (!selectedStudent) {
      toast({
        title: '학생 선택 필요',
        description: '리포트를 생성할 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    try {
      // Generate report
      const result = await generateMonthlyReport(
        selectedStudent,
        selectedYear,
        selectedMonth
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트 생성 실패')
      }

      setReportData(result.data)

      // Save report to database
      const saveResult = await saveReport(result.data, 'monthly')

      if (!saveResult.success) {
        console.warn('리포트 저장 실패:', saveResult.error)
      }

      toast({
        title: '리포트 생성 완료',
        description: `${result.data.student.name}의 ${selectedYear}년 ${selectedMonth}월 리포트가 생성되었습니다.`,
      })
    } catch (error: unknown) {
      console.error('Error generating report:', error)
      toast({
        title: '리포트 생성 오류',
        description: error instanceof Error ? error.message : '리포트를 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  function getTrendIcon(change: number | null) {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4" />
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="월간 리포트" description="학생별 월간 성적, 출석, 과제 완료율을 자동으로 분석하여 리포트를 생성하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="월간 리포트" reason="리포트 생성 시스템 업그레이드가 진행 중입니다." />;
  }

  return (
    <PageWrapper
      title="월간 리포트"
      subtitle="학생별 월간 성적 리포트를 생성하고 조회합니다"
    >
      <div className="space-y-6">

        {/* Report Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>리포트 생성</CardTitle>
            <CardDescription>
              학생과 기간을 선택하여 월간 리포트를 자동 생성합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="학생 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_code} - {student.users?.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={generateReport} disabled={generating || !selectedStudent}>
                {generating ? '생성 중...' : '리포트 생성'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Display */}
        {reportData && (
          <div className="space-y-6">
            {/* Academy & Student Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    {/* Academy Info */}
                    <div className="space-y-1">
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
                        {reportData.student.name} ({reportData.student.student_code})
                      </CardTitle>
                      <CardDescription>
                        {reportData.student.grade} | {selectedYear}년 {selectedMonth}월
                      </CardDescription>
                    </div>
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
                  year={selectedYear}
                  month={selectedMonth}
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
                <p className="text-sm leading-relaxed">{reportData.instructorComment}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!reportData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                학생과 기간을 선택하고 리포트를 생성해주세요
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
