'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ui/sheet'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Send, CheckCircle, XCircle, Clock, MessageSquare, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent } from '@/core/types/report.types'
import type { CategoryTemplates, ReportContextData } from '@/core/types/report-template.types'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import { TemplateSection } from '@/components/features/reports/template-section'

interface ReportSend {
  id: string
  recipient_name: string
  recipient_phone: string
  message_type: 'SMS' | 'LMS' | 'KAKAO'
  send_status: 'pending' | 'sent' | 'failed' | 'delivered'
  sent_at: string | null
  send_error: string | null
}

interface ReportRead {
  id: string
  report_send_id: string
  user_type: 'guardian' | 'student' | null
  read_at: string
  pdf_downloaded: boolean
  pdf_downloaded_at: string | null
}

interface ReportDetailContentProps {
  initialReport: ReportWithStudent
  initialReportSends: ReportSend[]
  initialReportReads: ReportRead[]
  reportId: string
}

export function ReportDetailContent({
  initialReport,
  initialReportSends,
  initialReportReads,
  reportId,
}: ReportDetailContentProps) {
  const [report, setReport] = useState<ReportWithStudent>(initialReport)
  const [reportSends, setReportSends] = useState<ReportSend[]>(initialReportSends)
  const [reportReads, setReportReads] = useState<ReportRead[]>(initialReportReads)
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
  const [showAllSends, setShowAllSends] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const contentRef = useRef<HTMLDivElement>(null)

  async function loadReport() {
    try {
      // Load report
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
        .eq('id', reportId)
        .single()

      if (error) throw error
      setReport(data as unknown as ReportWithStudent)

      // Load send history
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
        .eq('report_id', reportId)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false, nullsFirst: false })

      if (!sendsError && sendsData) {
        setReportSends(sendsData as ReportSend[])
      }

      // Load read history
      const { data: readsData } = await supabase
        .from('report_reads')
        .select('id, report_send_id, user_type, read_at, pdf_downloaded, pdf_downloaded_at')
        .eq('report_id', reportId)
        .order('read_at', { ascending: true })
      if (readsData) {
        setReportReads(readsData as ReportRead[])
      }
    } catch (error) {
      console.error('Error loading report:', error)
      toast({
        title: '로드 오류',
        description: '리포트를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
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
      const { sendReportToAllGuardians } = await import('@/app/actions/reports/send')

      const result = await sendReportToAllGuardians(reportId)

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

    // Create context from report data
    const context: ReportContextData = {
      studentName: reportData.studentName || report.students?.users?.name || '학생',
      attendanceRate: reportData.attendance?.rate ?? 0,
      homeworkRate: reportData.homework?.rate ?? 0,
      averageScore: reportData.scores?.length > 0
        ? Math.round(reportData.scores.reduce((sum: number, s: any) => sum + (s.current || 0), 0) / reportData.scores.length)
        : 0,
      scoreChange: (() => {
        if (!reportData.scores?.length) return 0
        const validChanges = reportData.scores.filter((s: any) => s.change !== null)
        if (validChanges.length === 0) return 0
        return Math.round(validChanges.reduce((sum: number, s: any) => sum + (s.change || 0), 0) / validChanges.length * 10) / 10
      })(),
    }
    setReportContext(context)

    // Load templates
    try {
      const { getReportTemplates } = await import('@/app/actions/reports/templates')
      const result = await getReportTemplates(context)
      if (result.success && result.data) {
        setCategoryTemplates(result.data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }

    setCommentDialogOpen(true)
  }

  const handleSaveComment = useCallback(async () => {
    if (!report || savingComment) return

    setSavingComment(true)
    try {
      const { updateReportComment } = await import('@/app/actions/reports/send')

      const result = await updateReportComment(report.id, commentForm)

      if (!result.success) {
        throw new Error(result.error || '코멘트 저장에 실패했습니다.')
      }

      toast({
        title: '저장 완료',
        description: '강사 코멘트가 성공적으로 저장되었습니다.',
      })

      setCommentDialogOpen(false)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, commentForm, savingComment])

  // Ctrl/Cmd+Enter to save comment
  useEffect(() => {
    if (!commentDialogOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSaveComment()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commentDialogOpen, handleSaveComment])

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

  // 최초 열람 기록을 report_send_id 기준으로 맵핑
  const readsBySendId = new Map<string, ReportRead>()
  reportReads.forEach(r => {
    if (!readsBySendId.has(r.report_send_id)) {
      readsBySendId.set(r.report_send_id, r)
    }
  })

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

  const reportData = report.content as any

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {getReportTypeLabel(report.report_type)} 리포트
              </h1>
              {report.sent_at ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  전송됨
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  미전송
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {formatPeriod(report.period_start, report.period_end)}
              {report.sent_at && (
                <span className="ml-2 text-xs">
                  (마지막 전송: {new Date(report.sent_at).toLocaleString('ko-KR')})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button onClick={handleSendClick} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {report.sent_at ? '재전송' : '보호자 전송'}
            </Button>
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

          {/* Send History */}
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
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>수신자</TableHead>
                          <TableHead>채널</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>발송일시</TableHead>
                          <TableHead>열람</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(showAllSends ? reportSends : reportSends.slice(0, 5)).map((send) => (
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
                                <Badge variant="default" className="bg-info">LMS</Badge>
                              )}
                              {send.message_type === 'KAKAO' && (
                                <Badge variant="default" className="bg-yellow-500 text-black">알림톡</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {send.send_status === 'sent' && (
                                <Badge variant="outline" className="bg-success/10">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  전송 완료
                                </Badge>
                              )}
                              {send.send_status === 'delivered' && (
                                <Badge variant="outline" className="bg-success/10">
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
                            <TableCell>
                              {(() => {
                                const read = readsBySendId.get(send.id)
                                if (!read) return <span className="text-muted-foreground text-sm">-</span>
                                return (
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                                      <Eye className="h-3 w-3 mr-1" />
                                      확인
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(read.read_at).toLocaleString('ko-KR')}
                                    </div>
                                    {read.pdf_downloaded && (
                                      <div className="text-xs text-muted-foreground">PDF 다운로드</div>
                                    )}
                                  </div>
                                )
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {reportSends.length > 5 && (
                    <div className="text-center pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllSends(prev => !prev)}
                      >
                        {showAllSends ? '접기' : `나머지 ${reportSends.length - 5}건 더보기`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Comment Edit Sheet */}
      <Sheet open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>강사 코멘트 작성</SheetTitle>
            <SheetDescription>
              구조화된 피드백을 작성하세요. <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd>로 저장할 수 있습니다.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="text-base font-semibold">
                총평
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
                예: 이번 달 학생은 수학 영역에서 두드러진 성장을 보였습니다.
              </p>
            </div>

            <Separator />

            {/* Strengths */}
            <div className="space-y-2">
              <Label htmlFor="strengths" className="text-base font-semibold">
                잘한 점
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

            {/* Improvements */}
            <div className="space-y-2">
              <Label htmlFor="improvements" className="text-base font-semibold">
                보완할 점
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

            {/* Next Goals */}
            <div className="space-y-2">
              <Label htmlFor="nextGoals" className="text-base font-semibold">
                다음 달 목표
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

          <div className="flex justify-end gap-2 pt-4 border-t">
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
        </SheetContent>
      </Sheet>

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

          .space-y-6 > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .space-y-6 {
            gap: 1rem;
          }
        }
      `}</style>
    </PageWrapper>
  )
}
