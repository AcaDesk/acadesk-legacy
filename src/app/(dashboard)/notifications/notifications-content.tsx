'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
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
import { Bell, CheckCircle, XCircle, Search, AlertCircle, MessageSquare, Settings, Wallet, RefreshCw, Loader2, ArrowRight, FlaskConical } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { getMessagingBalance } from '@/app/actions/messaging/config'

const BulkMessageDialog = dynamic(
  () => import('@/components/features/notifications/bulk-message-dialog').then((mod) => mod.BulkMessageDialog),
  { loading: () => null }
)

const ManageTemplatesDialog = dynamic(
  () => import('@/components/features/notifications/manage-templates-dialog').then((mod) => mod.ManageTemplatesDialog),
  { loading: () => null }
)

const MessageDetailModal = dynamic(
  () => import('@/components/features/notifications/message-detail-modal').then((mod) => mod.MessageDetailModal),
  { loading: () => null }
)

const PAGE_SIZE = 50

const EVENT_TYPE_LABELS: Record<string, string> = {
  check_in: '등원 알림',
  check_out: '하원 알림',
  attendance_confirmed: '출석 확인',
  absence_detected: '결석 알림',
  homework_assigned: '숙제 등록',
  homework_deadline: '숙제 마감',
  monthly_report_ready: '월말 리포트',
  weekly_report_ready: '주간 리포트',
  consultation_scheduled: '상담 일정',
  consultation_summary: '상담 결과',
  payment_confirmed: '결제 완료',
  payment_overdue: '미납 안내',
  exam_scheduled: '시험 일정',
  exam_grade_ready: '시험 성적',
  retest_required: '재시험',
  makeup_class_scheduled: '보강',
  academy_closure_notice: '휴원 안내',
  enrollment_welcome: '입학 환영',
  enrollment_terminated: '퇴원',
  book_lending_reminder: '도서 반납',
  class_schedule_changed: '수업 일정 변경',
}

function formatEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] || eventType
}

interface NotificationLog {
  id: string
  student_id: string | null
  notification_type: string
  status: string
  message: string
  sent_at: string
  error_message: string | null
  is_test: boolean
  recipient_name: string | null
  recipient_phone: string | null
  event_type: string | null
  kakao_template_id: string | null
  original_channel: string | null
  fallback_type: string | null
  students: {
    student_code: string
    users: {
      name: string
      phone: string | null
    } | null
  } | null
}

interface BalanceInfo {
  balance: number
  currency: string
  provider: string
}

interface NotificationsContentProps {
  initialLogs: NotificationLog[]
  initialBalance: BalanceInfo | null
  tenantId: string
}

export function NotificationsContent({ initialLogs, initialBalance, tenantId }: NotificationsContentProps) {
  const [logs, setLogs] = useState<NotificationLog[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'lms' | 'mms' | 'kakao' | 'email'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialLogs.length >= PAGE_SIZE)
  const [sendMessageOpen, setSendMessageOpen] = useState(false)
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false)
  const [balance, setBalance] = useState<BalanceInfo | null>(initialBalance)
  const [balanceLoading, setBalanceLoading] = useState(!initialBalance)
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const filteredLogs = useMemo(() => {
    let filtered = logs

    if (filterType !== 'all') {
      filtered = filtered.filter((log) => log.notification_type === filterType)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((log) => log.status === filterStatus)
    }

    if (searchTerm) {
      filtered = filtered.filter((log) => {
        const studentName = log.students?.users?.name?.toLowerCase() || ''
        const studentCode = log.students?.student_code?.toLowerCase() || ''
        const message = log.message?.toLowerCase() || ''
        const phone = log.students?.users?.phone?.toLowerCase() || ''
        const recipientName = log.recipient_name?.toLowerCase() || ''
        const recipientPhone = log.recipient_phone?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return (
          studentName.includes(search) ||
          studentCode.includes(search) ||
          message.includes(search) ||
          phone.includes(search) ||
          recipientName.includes(search) ||
          recipientPhone.includes(search)
        )
      })
    }

    return filtered
  }, [logs, filterType, filterStatus, searchTerm])

  async function loadNotificationLogs() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          id,
          student_id,
          notification_type,
          status,
          message,
          sent_at,
          error_message,
          is_test,
          recipient_name,
          recipient_phone,
          event_type,
          kakao_template_id,
          original_channel,
          fallback_type,
          students (
            student_code,
            users (name, phone)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) throw error
      const newLogs = data as unknown as NotificationLog[]
      setLogs(newLogs)
      setHasMore(newLogs.length >= PAGE_SIZE)
    } catch (error) {
      console.error('Error loading logs:', error)
      toast({
        title: '데이터 로드 오류',
        description: '알림 로그를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || logs.length === 0) return

    const lastLog = logs[logs.length - 1]
    const cursorSentAt = lastLog.sent_at
    const cursorId = lastLog.id

    try {
      setLoadingMore(true)

      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          id,
          student_id,
          notification_type,
          status,
          message,
          sent_at,
          error_message,
          is_test,
          recipient_name,
          recipient_phone,
          event_type,
          kakao_template_id,
          original_channel,
          fallback_type,
          students (
            student_code,
            users (name, phone)
          )
        `)
        .eq('tenant_id', tenantId)
        .or(`sent_at.lt.${cursorSentAt},and(sent_at.eq.${cursorSentAt},id.lt.${cursorId})`)
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) throw error
      const moreLogs = data as unknown as NotificationLog[]
      setLogs(prev => [...prev, ...moreLogs])
      setHasMore(moreLogs.length >= PAGE_SIZE)
    } catch (error) {
      console.error('Error loading more logs:', error)
      toast({
        title: '데이터 로드 오류',
        description: '추가 로그를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, logs, supabase, tenantId, toast])

  const loadBalance = useCallback(async () => {
    try {
      setBalanceLoading(true)
      const result = await getMessagingBalance()

      if (result.success && result.data) {
        setBalance(result.data)
      } else {
        setBalance(null)
      }
    } catch (error) {
      console.error('Error loading balance:', error)
      setBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialBalance) {
      void loadBalance()
    }
  }, [initialBalance, loadBalance])

  function getStatusBadge(status: string) {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-success/10">
            <CheckCircle className="h-3 w-3 mr-1" />
            전송 완료
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            전송 실패
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'sms':
        return <Badge variant="default">SMS</Badge>
      case 'lms':
        return <Badge variant="default" className="bg-info">LMS</Badge>
      case 'mms':
        return <Badge variant="default" className="bg-purple-600">MMS</Badge>
      case 'kakao':
        return <Badge variant="default" className="bg-yellow-500 text-black">알림톡</Badge>
      case 'email':
        return <Badge variant="default" className="bg-gray-600">이메일</Badge>
      default:
        return <Badge variant="secondary">{type.toUpperCase()}</Badge>
    }
  }

  function buildSummary(log: NotificationLog): string {
    const studentName = log.students?.users?.name
    const recipientName = log.recipient_name
    const recipientPhone = log.recipient_phone

    if (log.is_test) {
      return `테스트 발송 → ${recipientPhone || recipientName || '수신자 미지정'}`
    }

    // 수신자 표기: 이름과 전화번호 조합. 둘 다 없으면 학생명 기반 폴백.
    const recipientLabel = recipientName
      ? recipientPhone
        ? `${recipientName} (${recipientPhone})`
        : recipientName
      : recipientPhone || null

    if (log.event_type) {
      const eventLabel = formatEventType(log.event_type)
      if (studentName) return `[${eventLabel}] ${studentName} 보호자에게 발송`
      if (recipientLabel) return `[${eventLabel}] ${recipientLabel}에게 발송`
      return `[${eventLabel}] 발송`
    }

    if (studentName) {
      return recipientLabel
        ? `${studentName} → ${recipientLabel}에게 발송`
        : `${studentName} 보호자에게 발송`
    }

    return recipientLabel ? `${recipientLabel}에게 발송` : '수신자 미지정'
  }

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    sms: logs.filter((l) => l.notification_type === 'sms').length,
    lms: logs.filter((l) => l.notification_type === 'lms').length,
    mms: logs.filter((l) => l.notification_type === 'mms').length,
    kakao: logs.filter((l) => l.notification_type === 'kakao').length,
    email: logs.filter((l) => l.notification_type === 'email').length,
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">메시지 관리</h1>
            <p className="text-muted-foreground">메시지 전송 이력과 통계를 확인하세요</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Balance Info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">잔액</span>
                {balanceLoading ? (
                  <span className="ml-2 inline-block h-4 w-16 animate-pulse rounded bg-muted-foreground/20 align-middle" />
                ) : (
                  <span className="ml-2 font-semibold">
                    {balance ? `${balance.balance.toLocaleString()}원` : '-'}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={loadBalance}
                disabled={balanceLoading}
              >
                <RefreshCw className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setManageTemplatesOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                템플릿 관리
              </Button>
              <Button
                onClick={() => setSendMessageOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                메시지 전송
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전체 전송</CardDescription>
              <CardTitle className="text-3xl">{stats.total}건</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>SMS {stats.sms}</span>
                <span>.</span>
                <span>LMS {stats.lms}</span>
                {stats.mms > 0 && (
                  <>
                    <span>.</span>
                    <span>MMS {stats.mms}</span>
                  </>
                )}
                <span>.</span>
                <span className="text-yellow-600">알림톡 {stats.kakao}</span>
                {stats.email > 0 && (
                  <>
                    <span>.</span>
                    <span>이메일 {stats.email}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전송 완료</CardDescription>
              <CardTitle className="text-3xl text-success">{stats.sent}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전송 실패</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.failed}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>성공률</CardDescription>
              <CardTitle className="text-3xl">
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생명, 학생번호, 메시지, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              전체
            </Button>
            <Button
              variant={filterType === 'sms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('sms')}
            >
              SMS ({stats.sms})
            </Button>
            <Button
              variant={filterType === 'lms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('lms')}
            >
              LMS ({stats.lms})
            </Button>
            <Button
              variant={filterType === 'mms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('mms')}
            >
              MMS ({stats.mms})
            </Button>
            <Button
              variant={filterType === 'kakao' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('kakao')}
              className={filterType === 'kakao' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}
            >
              알림톡 ({stats.kakao})
            </Button>
            <Button
              variant={filterType === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('email')}
            >
              이메일 ({stats.email})
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              전체
            </Button>
            <Button
              variant={filterStatus === 'sent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('sent')}
            >
              성공
            </Button>
            <Button
              variant={filterStatus === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('failed')}
            >
              실패
            </Button>
          </div>
        </div>

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <CardTitle>메시지 전송 이력</CardTitle>
            <CardDescription>전송 기록</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">로딩 중...</div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>전송 이력이 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>대상</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>발송 요약</TableHead>
                        <TableHead>전송 일시</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const studentName = log.students?.users?.name
                        const displayName = log.is_test
                          ? '테스트 발송'
                          : studentName || log.recipient_name || '수신자 미지정'
                        const displayPhone = log.recipient_phone || log.students?.users?.phone
                        return (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedLog(log)
                              setDetailModalOpen(true)
                            }}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                  <span>{displayName}</span>
                                  {log.is_test && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px] px-1.5 py-0 h-4">
                                      <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
                                      테스트
                                    </Badge>
                                  )}
                                </div>
                                {log.students?.student_code && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.students.student_code}
                                  </div>
                                )}
                                {displayPhone && (
                                  <div className="text-xs text-muted-foreground">
                                    {displayPhone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {log.original_channel === 'kakao' && log.notification_type !== 'kakao' ? (
                                  <>
                                    <Badge variant="default" className="bg-yellow-500 text-black opacity-60 line-through">알림톡</Badge>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    {getTypeBadge(log.notification_type)}
                                  </>
                                ) : (
                                  getTypeBadge(log.notification_type)
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm">{buildSummary(log)}</p>
                                {log.error_message && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    {log.error_message}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(log.sent_at).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          불러오는 중...
                        </>
                      ) : (
                        '더 보기'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Dialogs */}
        {sendMessageOpen ? (
          <BulkMessageDialog
            open={sendMessageOpen}
            onOpenChange={setSendMessageOpen}
            tenantId={tenantId}
            onMessageSent={() => {
              loadNotificationLogs()
            }}
          />
        ) : null}

        {manageTemplatesOpen ? (
          <ManageTemplatesDialog
            open={manageTemplatesOpen}
            onOpenChange={setManageTemplatesOpen}
          />
        ) : null}

        {detailModalOpen && selectedLog ? (
          <MessageDetailModal
            log={selectedLog}
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
          />
        ) : null}
      </div>
    </PageWrapper>
  )
}
