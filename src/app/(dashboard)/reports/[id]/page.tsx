'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Download, Send, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportData } from '@/services/report.service'
import Link from 'next/link'
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

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

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
      setReport(data as unknown)
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

  async function handleSendToGuardian() {
    if (!report) return

    const studentName = report.students?.users?.name || '학생'

    if (!confirm(`"${studentName}" 학생의 보호자에게 리포트를 전송하시겠습니까?`)) {
      return
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from('reports')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', params.id)

      if (error) throw error

      toast({
        title: '전송 완료',
        description: `${studentName} 학생의 보호자에게 리포트가 전송되었습니다.`,
      })

      loadReport()
    } catch (error) {
      console.error('Error sending report:', error)
      toast({
        title: '전송 오류',
        description: '리포트를 전송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
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

  const reportData = report.content

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground transition-colors">
              리포트 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">리포트 상세</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {getReportTypeLabel(report.report_type)} 리포트
              </h1>
              <p className="text-muted-foreground">
                {formatPeriod(report.period_start, report.period_end)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF 다운로드
              </Button>
              {!report.sent_at && (
                <Button onClick={handleSendToGuardian} disabled={sending}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? '전송 중...' : '보호자 전송'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Student Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {reportData.student.name} ({reportData.student.student_code})
                </CardTitle>
                <CardDescription className="mt-2">
                  {reportData.student.grade} | {report.students?.users?.email || '이메일 없음'}
                </CardDescription>
              </div>
              {report.sent_at && (
                <Badge variant="outline">
                  전송 완료: {new Date(report.sent_at).toLocaleDateString('ko-KR')}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Attendance & Homework Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>출석 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-blue-600 mb-4">
                {reportData.attendance.rate}%
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">총 출석일</span>
                  <span className="font-medium">{reportData.attendance.total}일</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">출석</span>
                  <span className="font-medium text-green-600">
                    {reportData.attendance.present}일
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">지각</span>
                  <span className="font-medium text-yellow-600">
                    {reportData.attendance.late}일
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">결석</span>
                  <span className="font-medium text-red-600">
                    {reportData.attendance.absent}일
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
                {reportData.homework.rate}%
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">전체 과제</span>
                  <span className="font-medium">{reportData.homework.total}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">완료</span>
                  <span className="font-medium text-green-600">
                    {reportData.homework.completed}개
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">미완료</span>
                  <span className="font-medium text-red-600">
                    {reportData.homework.total - reportData.homework.completed}개
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
              {reportData.instructorComment}
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
    </PageWrapper>
  )
}
