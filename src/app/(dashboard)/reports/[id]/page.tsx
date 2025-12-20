'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePDF } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
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
import { Download, Send, Edit2, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent } from '@/core/types/report.types'
import type { CategoryTemplates, ReportContextData } from '@/core/types/report-template.types'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import { ReportPdfDocument } from '@/components/features/reports/ReportPdfDocument'
import { TemplateSection } from '@/components/features/reports/template-section'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface ReportSend {
  id: string
  recipient_name: string
  recipient_phone: string
  message_type: 'SMS' | 'LMS' | 'KAKAO'
  send_status: 'pending' | 'sent' | 'failed' | 'delivered'
  sent_at: string | null
  send_error: string | null
}

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  // All Hooks must be called before any early returns
  const [report, setReport] = useState<ReportWithStudent | null>(null)
  const [reportSends, setReportSends] = useState<ReportSend[]>([])
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
  const [categoryTemplates, setCategoryTemplates] = useState<CategoryTemplates[]>([])
  const [reportContext, setReportContext] = useState<ReportContextData | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const contentRef = useRef<HTMLDivElement>(null)

  // PDF generation with usePDF hook
  // Only initialize PDF when report is available
  const [instance, updatePdf] = usePDF({
    document: <></>,
  })

  // Update PDF when report data changes
  useEffect(() => {
    if (report) {
      try {
        const pdfDocument = (
          <ReportPdfDocument
            reportData={report.content}
            studentName={report.students?.users?.name || report.content.studentName || report.content.student?.name || '학생'}
            studentCode={report.students?.student_code || report.content.studentCode || report.content.student?.student_code || ''}
            studentGrade={report.students?.grade || report.content.grade || report.content.student?.grade || ''}
            periodStart={report.period_start}
            periodEnd={report.period_end}
            generatedAt={report.generated_at}
          />
        )
        updatePdf(pdfDocument)
      } catch (error) {
        console.error('PDF update error:', error)
        // Silently fail PDF updates to avoid crashing the UI
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadReport() {
    try {
      setLoading(true)

      // 리포트 조회
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
      setReport(data as unknown as ReportWithStudent)

      // 전송 이력 조회
      const { data: sendsData, error: sendsError } = await supabase
        .from('report_sends')
        .select(`
          id,
          recipient_name,
          recipient_phone,
          message_type,
          send_status,
          sent_at,
          send_error
        `)
        .eq('report_id', params.id)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false, nullsFirst: false })

      if (!sendsError && sendsData) {
        setReportSends(sendsData as ReportSend[])
      }
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

  async function handleEditComment() {
    if (!report) return

    // Access report content data
    const reportData = report.content as any

    // Try to load from new JSON format first
    if (reportData.comment) {
      setCommentForm({
        summary: reportData.comment.summary || '',
        strengths: reportData.comment.strengths || '',
        improvements: reportData.comment.improvements || '',
        nextGoals: reportData.comment.nextGoals || '',
      })
    } else {
      // Fallback: Parse legacy string format
      const currentComment = reportData.overallComment || reportData.instructorComment || ''
      const lines = currentComment.split('\n').filter((l: string) => l.trim())
      setCommentForm({
        summary: lines[0] || '',
        strengths: lines[1] || '',
        improvements: lines[2] || '',
        nextGoals: lines[3] || '',
      })
    }

    // 리포트 데이터에서 컨텍스트 생성
    const context: ReportContextData = {
      studentName: reportData.studentName || report.students?.users?.name || '학생',
      attendanceRate: reportData.attendance?.rate ?? 0,
      homeworkRate: reportData.homework?.rate ?? 0,
      averageScore: reportData.currentScore ?? 0,
      scoreChange: reportData.scoreTrend ?? 0,
    }
    setReportContext(context)

    // 템플릿 로드
    try {
      const { getReportTemplates } = await import('@/app/actions/report-templates')
      const result = await getReportTemplates(context)
      if (result.success && result.data) {
        setCategoryTemplates(result.data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }

    setCommentDialogOpen(true)
  }

  async function handleSaveComment() {
    if (!report) return

    setSavingComment(true)
    try {
      // Dynamic import to avoid bundling server action in client
      const { updateReportComment } = await import('@/app/actions/reports')

      // Call server action with structured comment data
      const result = await updateReportComment(report.id, commentForm)

      if (!result.success) {
        throw new Error(result.error || '코멘트 저장에 실패했습니다.')
      }

      toast({
        title: '저장 완료',
        description: '강사 코멘트가 성공적으로 저장되었습니다.',
      })

      // Close dialog first to prevent rendering conflicts
      setCommentDialogOpen(false)

      // Reload report to get updated data
      // Add small delay to allow state to stabilize
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadReport()
    } catch (error) {
      console.error('Error saving comment:', error)
      toast({
        title: '저장 오류',
        description: error instanceof Error ? error.message : '코멘트를 저장하는 중 오류가 발생했습니다.',
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

  // PDF download handler
  function handlePdfDownload() {
    if (instance.loading) {
      toast({
        title: 'PDF 생성 중',
        description: 'PDF를 생성하는 중입니다. 잠시만 기다려주세요.',
      })
      return
    }

    if (!instance.blob) {
      toast({
        title: 'PDF 생성 실패',
        description: 'PDF를 생성할 수 없습니다. 페이지를 새로고침한 후 다시 시도해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!report) return

    try {
      // Create anchor tag to trigger download
      const link = document.createElement('a')
      link.href = URL.createObjectURL(instance.blob)
      const studentName = report.students?.users?.name || report.content.studentName || report.content.student?.name || '학생'
      const fileName = `${studentName}_${new Date(report.period_start).getFullYear()}년_${new Date(report.period_start).getMonth() + 1}월_리포트.pdf`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast({
        title: 'PDF 다운로드 완료',
        description: `${studentName} 학생의 리포트가 다운로드되었습니다.`,
      })
    } catch (error) {
      console.error('PDF download error:', error)
      toast({
        title: '다운로드 실패',
        description: 'PDF 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
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
          <Button onClick={() => router.push('/reports')}>목록으로 돌아가기</Button>
        </div>
      </PageWrapper>
    )
  }

  const reportData = report.content as any // Support both old and new format

  /**
   * Data Access Strategy: Source of Truth
   * Priority: report.students (joined data from DB) > reportData.* (snapshot in JSONB)
   * This ensures we always display the latest student information
   */

  // Student info - Use joined data as Source of Truth
  const studentName = report.students?.users?.name || reportData.studentName || reportData.student?.name || '학생'
  const studentCode = report.students?.student_code || reportData.studentCode || reportData.student?.student_code || ''
  const studentGrade = report.students?.grade || reportData.grade || reportData.student?.grade || ''

  return (
    <PageWrapper>
      <div className="space-y-6">
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
            {/* PDF 다운로드 버튼 임시 숨김 */}
            {/* <Button
              variant="outline"
              onClick={handlePdfDownload}
              disabled={instance.loading && !instance.blob}
            >
              <Download className="h-4 w-4 mr-2" />
              {instance.loading && !instance.blob ? 'PDF 준비 중...' : 'PDF 다운로드'}
            </Button> */}
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

          {/* 전송 이력 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                전송 이력
              </CardTitle>
              <CardDescription>
                이 리포트의 발송 내역입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportSends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>아직 전송 이력이 없습니다.</p>
                  <p className="text-sm mt-1">보호자에게 리포트를 전송하면 이곳에 기록됩니다.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>수신자</TableHead>
                        <TableHead>채널</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>발송일시</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportSends.map((send) => (
                        <TableRow key={send.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{send.recipient_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {send.recipient_phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {send.message_type === 'SMS' && (
                              <Badge variant="default">SMS</Badge>
                            )}
                            {send.message_type === 'LMS' && (
                              <Badge variant="default" className="bg-blue-600">LMS</Badge>
                            )}
                            {send.message_type === 'KAKAO' && (
                              <Badge variant="default" className="bg-yellow-500 text-black">알림톡</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {send.send_status === 'sent' && (
                              <Badge variant="outline" className="bg-green-50">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                전송 완료
                              </Badge>
                            )}
                            {send.send_status === 'delivered' && (
                              <Badge variant="outline" className="bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                수신 확인
                              </Badge>
                            )}
                            {send.send_status === 'pending' && (
                              <Badge variant="outline" className="bg-yellow-50">
                                <Clock className="h-3 w-3 mr-1" />
                                대기중
                              </Badge>
                            )}
                            {send.send_status === 'failed' && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                실패
                              </Badge>
                            )}
                            {send.send_error && (
                              <div className="text-xs text-red-600 mt-1">
                                {send.send_error}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {send.sent_at
                              ? new Date(send.sent_at).toLocaleString('ko-KR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
              {reportContext && categoryTemplates.find(c => c.category === 'summary') && (
                <TemplateSection
                  categoryData={categoryTemplates.find(c => c.category === 'summary')!}
                  context={reportContext}
                  onSelect={(content) => {
                    setCommentForm(prev => ({
                      ...prev,
                      summary: prev.summary ? `${prev.summary}\n\n${content}` : content
                    }))
                  }}
                />
              )}
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
              {reportContext && categoryTemplates.find(c => c.category === 'strengths') && (
                <TemplateSection
                  categoryData={categoryTemplates.find(c => c.category === 'strengths')!}
                  context={reportContext}
                  onSelect={(content) => {
                    setCommentForm(prev => ({
                      ...prev,
                      strengths: prev.strengths ? `${prev.strengths}\n\n${content}` : content
                    }))
                  }}
                />
              )}
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
              {reportContext && categoryTemplates.find(c => c.category === 'improvements') && (
                <TemplateSection
                  categoryData={categoryTemplates.find(c => c.category === 'improvements')!}
                  context={reportContext}
                  onSelect={(content) => {
                    setCommentForm(prev => ({
                      ...prev,
                      improvements: prev.improvements ? `${prev.improvements}\n\n${content}` : content
                    }))
                  }}
                />
              )}
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
              {reportContext && categoryTemplates.find(c => c.category === 'nextGoals') && (
                <TemplateSection
                  categoryData={categoryTemplates.find(c => c.category === 'nextGoals')!}
                  context={reportContext}
                  onSelect={(content) => {
                    setCommentForm(prev => ({
                      ...prev,
                      nextGoals: prev.nextGoals ? `${prev.nextGoals}\n\n${content}` : content
                    }))
                  }}
                />
              )}
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
