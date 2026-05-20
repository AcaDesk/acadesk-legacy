'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getReportDetail } from '@/app/actions/reports/queries'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Alert, AlertDescription } from '@ui/alert'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ui/sheet'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Send, CheckCircle, XCircle, Clock, MessageSquare, Eye, Info, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent, ReportSend, ReportRead } from '@/core/types/report.types'
import type { CategoryTemplates, ReportContextData } from '@/core/types/report-template.types'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import { TemplateSection } from '@/components/features/reports/template-section'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import { renderKakaoTemplatePreview } from '@/lib/kakao/kakao-variables'
import { getVariableDescriptionString } from '@/lib/kakao/kakao-constants'
import { type ReportSendChannel, REPORT_SEND_CHANNEL_LABELS } from '@/app/(dashboard)/reports/new/stepper/use-report-stepper'

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
  const [sendChannel, setSendChannel] = useState<ReportSendChannel>('sms')

  const {
    hasKakaoChannel,
    isChannelChecked: kakaoChannelChecked,
    isCheckingChannel: checkingKakaoChannel,
    templates: kakaoTemplates,
    isLoadingTemplates: loadingKakaoTemplates,
    checkChannel: checkKakaoChannel,
    loadTemplates: loadKakaoTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  const { toast } = useToast()
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)

  // 리포트 종류에 따라 강제 매칭되는 알림톡 템플릿 event_type
  // (월간 리포트 -> monthly_report_ready, 주간 -> weekly_report_ready)
  const requiredKakaoEventType = useMemo<string | null>(() => {
    if (report.report_type === 'monthly') return 'monthly_report_ready'
    if (report.report_type === 'weekly') return 'weekly_report_ready'
    return null
  }, [report.report_type])

  // 해당 리포트 종류에 맞는 승인 템플릿 (보통 1개)
  const matchedKakaoTemplate = useMemo(() => {
    if (!requiredKakaoEventType) return null
    return kakaoTemplates.find((t) => t.eventType === requiredKakaoEventType) ?? null
  }, [kakaoTemplates, requiredKakaoEventType])

  const selectedKakaoTemplate = matchedKakaoTemplate

  const loadReport = useCallback(async () => {
    const result = await getReportDetail(reportId)
    if (!result.success) {
      console.error('Error loading report:', result.error)
      toast({
        title: '로드 오류',
        description: result.error || '리포트를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
      return
    }
    setReport(result.data.report)
    setReportSends(result.data.sends)
    setReportReads(result.data.reads)
  }, [reportId, toast])

  function handleSendClick() {
    setSendDialogOpen(true)
  }

  async function handleConfirmSend() {
    if (!report) return
    const kakaoTemplateIdToUse = matchedKakaoTemplate?.id ?? ''
    if (sendChannel === 'kakao' && !kakaoTemplateIdToUse) {
      toast({
        title: '사용할 수 있는 알림톡 템플릿이 없습니다',
        description: requiredKakaoEventType
          ? `이 리포트 종류에 해당하는 승인 템플릿(${requiredKakaoEventType})이 등록되어 있지 않습니다.`
          : '리포트 종류와 매칭되는 템플릿이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    const studentName = report.content.studentName || report.students?.users?.name || '학생'

    setSending(true)
    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports/send')

      const result = await sendReportToAllGuardians(reportId, {
        channel: sendChannel,
        ...(sendChannel === 'kakao' && { kakaoTemplateId: kakaoTemplateIdToUse }),
      })

      if (!result.success) {
        throw new Error(result.error || '리포트 전송에 실패했습니다')
      }

      const { successCount, failCount } = result.data!
      const channelLabel = REPORT_SEND_CHANNEL_LABELS[sendChannel]

      toast({
        title: '전송 완료',
        description: `${studentName} 학생의 보호자 ${successCount}명에게 ${channelLabel}로 리포트가 전송되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
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

  useEffect(() => {
    if (sendDialogOpen && !kakaoChannelChecked) {
      void checkKakaoChannel()
    }
  }, [sendDialogOpen, kakaoChannelChecked, checkKakaoChannel])

  useEffect(() => {
    if (sendChannel !== 'kakao') return
    if (hasKakaoChannel && kakaoTemplates.length === 0) {
      void loadKakaoTemplates()
    }
  }, [sendChannel, hasKakaoChannel, kakaoTemplates.length, loadKakaoTemplates])

  useEffect(() => {
    if (sendChannel === 'kakao' && kakaoChannelChecked && !hasKakaoChannel) {
      setSendChannel('sms')
    }
  }, [sendChannel, kakaoChannelChecked, hasKakaoChannel])

  async function handleEditComment() {
    if (!report) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? Math.round(reportData.scores.reduce((sum: number, s: any) => sum + (s.current || 0), 0) / reportData.scores.length)
        : 0,
      scoreChange: (() => {
        if (!reportData.scores?.length) return 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validChanges = reportData.scores.filter((s: any) => s.change !== null)
        if (validChanges.length === 0) return 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [report, commentForm, savingComment, loadReport, toast])

  // 최초 열람 기록을 report_send_id 기준으로 맵핑
  const readsBySendId = useMemo(() => {
    const map = new Map<string, ReportRead>()
    reportReads.forEach(r => {
      if (!map.has(r.report_send_id)) {
        map.set(r.report_send_id, r)
      }
    })
    return map
  }, [reportReads])

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportData = report.content as any

  // Student info - Use joined data as Source of Truth
  const studentName = report.students?.users?.name || reportData.studentName || reportData.student?.name || '학생'
  const studentCode = report.students?.student_code || reportData.studentCode || reportData.student?.student_code || ''
  const studentGrade = report.students?.grade || reportData.grade || reportData.student?.grade || ''
  const reportPeriodLabel = formatPeriod(report.period_start, report.period_end)
  const kakaoPreview = selectedKakaoTemplate
    ? renderKakaoTemplatePreview(selectedKakaoTemplate.content, {
        학생명: studentName,
        보호자명: '보호자',
        기간: reportPeriodLabel,
        출석률: reportData.attendance?.rate !== undefined ? `${reportData.attendance.rate}%` : '',
        숙제완료율: reportData.homework?.rate !== undefined ? `${reportData.homework.rate}%` : '',
        학원명: reportData.academy?.name || '',
        학원연락처: reportData.academy?.phone || '',
        종합평가: reportData.comment?.summary || reportData.instructorComment || '',
        리포트링크: '[리포트 링크]',
      })
    : ''

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

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>리포트 전송</DialogTitle>
            <DialogDescription>
              {studentName} 학생의 보호자에게 리포트를 전송합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>발송 채널</Label>
              <Select
                value={sendChannel}
                onValueChange={(value) => setSendChannel(value as ReportSendChannel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="발송 채널 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">문자 (SMS/LMS 자동)</SelectItem>
                  <SelectItem value="lms">LMS</SelectItem>
                  <SelectItem value="kakao" disabled={!hasKakaoChannel || checkingKakaoChannel}>
                    카카오 알림톡
                    {!hasKakaoChannel && !checkingKakaoChannel ? ' (채널 연동 필요)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
              {checkingKakaoChannel && (
                <p className="text-xs text-muted-foreground">알림톡 채널 연동 상태를 확인 중입니다.</p>
              )}
            </div>

            {sendChannel === 'kakao' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>알림톡 템플릿</Label>
                  {loadingKakaoTemplates ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      템플릿 확인 중...
                    </div>
                  ) : matchedKakaoTemplate ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">{matchedKakaoTemplate.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {report.report_type === 'monthly' ? '월간' : report.report_type === 'weekly' ? '주간' : '리포트'} 종류에 맞춰 자동 선택됩니다.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      이 리포트 종류({report.report_type === 'monthly' ? '월간' : report.report_type === 'weekly' ? '주간' : report.report_type})에 해당하는 승인된 알림톡 템플릿이 없습니다. 설정 &gt; 카카오 알림톡 템플릿에서 등록해주세요.
                    </div>
                  )}
                </div>

                {matchedKakaoTemplate && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <p>사용 가능한 리포트 변수: {getVariableDescriptionString()}, {'#{리포트링크}'}</p>
                      <div className="rounded-md border bg-background p-3 text-xs whitespace-pre-wrap">
                        {kakaoPreview}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sending}>
              취소
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sending || (sendChannel === 'kakao' && !matchedKakaoTemplate)}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
