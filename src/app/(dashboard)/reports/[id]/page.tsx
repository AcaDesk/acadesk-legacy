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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Download, Send, ChevronRight, Edit2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportData } from '@/core/types/report-entity'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import Link from 'next/link'

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
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [commentForm, setCommentForm] = useState({
    summary: '',
    strengths: '',
    improvements: '',
    nextGoals: '',
  })
  const [savingComment, setSavingComment] = useState(false)

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

  function handleEditComment() {
    const currentComment = reportData.overallComment || reportData.instructorComment || ''

    // 기존 코멘트를 파싱하여 폼에 채우기 (간단한 파싱)
    const lines = currentComment.split('\n').filter(l => l.trim())
    setCommentForm({
      summary: lines[0] || '',
      strengths: lines[1] || '',
      improvements: lines[2] || '',
      nextGoals: lines[3] || '',
    })

    setCommentDialogOpen(true)
  }

  async function handleSaveComment() {
    if (!report) return

    setSavingComment(true)
    try {
      // 구조화된 코멘트를 하나의 문자열로 합치기
      const structuredComment = `📝 총평
${commentForm.summary}

✨ 잘한 점
${commentForm.strengths}

📈 보완할 점
${commentForm.improvements}

🎯 다음 달 목표
${commentForm.nextGoals}`

      // reportData 업데이트
      const updatedContent = {
        ...report.content,
        overallComment: structuredComment,
        instructorComment: structuredComment,
      }

      // DB 업데이트
      const { error } = await supabase
        .from('reports')
        .update({ content: updatedContent })
        .eq('id', report.id)

      if (error) throw error

      // 로컬 state 업데이트
      setReport({
        ...report,
        content: updatedContent,
      })

      toast({
        title: '저장 완료',
        description: '강사 코멘트가 성공적으로 저장되었습니다.',
      })

      setCommentDialogOpen(false)
    } catch (error) {
      console.error('Error saving comment:', error)
      toast({
        title: '저장 오류',
        description: '코멘트를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSavingComment(false)
    }
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
    <PageWrapper>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
          <Link href="/reports" className="hover:text-foreground transition-colors">
            리포트 관리
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {studentName}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {getReportTypeLabel(report.report_type)} 리포트
            </h1>
            <p className="text-muted-foreground">
              {formatPeriod(report.period_start, report.period_end)}
            </p>
          </div>
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
        </div>

        <div ref={contentRef} className="max-w-5xl mx-auto space-y-6">
          <ReportViewer
            reportData={{
              ...reportData,
              studentName,
              studentCode,
              grade: studentGrade,
            }}
            onEditComment={handleEditComment}
            showEditButton={true}
          />

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
        </div> {/* contentRef div */}
      </div> {/* space-y-6 div */}

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

      {/* Comment Edit Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>강사 코멘트 작성</DialogTitle>
            <DialogDescription>
              학생의 성장을 위한 구조화된 피드백을 작성하세요. 작성한 내용은 리포트에 자동으로 반영됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 총평 */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="text-base font-semibold">
                📝 총평
              </Label>
              <Textarea
                id="summary"
                placeholder="이번 달 학생의 전반적인 학습 상황을 간략히 요약해주세요..."
                value={commentForm.summary}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, summary: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                예: 이번 달 ○○ 학생은 수학 영역에서 두드러진 성장을 보였습니다.
              </p>
            </div>

            <Separator />

            {/* 잘한 점 */}
            <div className="space-y-2">
              <Label htmlFor="strengths" className="text-base font-semibold">
                ✨ 잘한 점
              </Label>
              <Textarea
                id="strengths"
                placeholder="학생이 특히 잘한 점이나 긍정적인 변화를 구체적으로 적어주세요..."
                value={commentForm.strengths}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, strengths: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                예: 어려운 문제를 포기하지 않고 끝까지 해결하려는 자세가 훌륭했습니다.
              </p>
            </div>

            <Separator />

            {/* 보완할 점 */}
            <div className="space-y-2">
              <Label htmlFor="improvements" className="text-base font-semibold">
                📈 보완할 점
              </Label>
              <Textarea
                id="improvements"
                placeholder="개선이 필요한 부분을 긍정적으로 표현해주세요..."
                value={commentForm.improvements}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, improvements: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                예: 기본 개념 학습에 조금 더 시간을 투자하면 응용 문제 풀이가 더 수월할 것 같습니다.
              </p>
            </div>

            <Separator />

            {/* 다음 달 목표 */}
            <div className="space-y-2">
              <Label htmlFor="nextGoals" className="text-base font-semibold">
                🎯 다음 달 목표
              </Label>
              <Textarea
                id="nextGoals"
                placeholder="다음 달 학습 목표나 권장 사항을 적어주세요..."
                value={commentForm.nextGoals}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, nextGoals: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                예: 다음 달에는 응용 문제 풀이 시간을 늘려 실전 감각을 키우는 것을 목표로 합니다.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setCommentDialogOpen(false)}
              disabled={savingComment}
            >
              취소
            </Button>
            <Button onClick={handleSaveComment} disabled={savingComment}>
              {savingComment ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
