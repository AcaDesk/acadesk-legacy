'use client'

import { useState, useEffect } from 'react'
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
import { Bell, CheckCircle, XCircle, Search, AlertCircle, MessageSquare, Settings, Wallet, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { BulkMessageDialog } from '@/components/features/notifications/bulk-message-dialog'
import { ManageTemplatesDialog } from '@/components/features/notifications/manage-templates-dialog'
import { getMessagingBalance } from '@/app/actions/messaging-config'

interface NotificationLog {
  id: string
  student_id: string
  notification_type: string
  status: string
  message: string
  sent_at: string
  error_message: string | null
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

export default function NotificationsPage() {
  // All Hooks must be called before any early returns
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'lms' | 'kakao'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all')
  const [loading, setLoading] = useState(true)
  const [sendMessageOpen, setSendMessageOpen] = useState(false)
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false)
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadNotificationLogs()
    loadBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterType, filterStatus, logs])

  // Function definitions
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
          students (
            student_code,
            users (name, phone)
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data as unknown as NotificationLog[])
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

  async function loadBalance() {
    try {
      setBalanceLoading(true)
      const result = await getMessagingBalance()

      if (result.success && result.data) {
        setBalance(result.data)
      } else {
        // 설정이 없거나 활성화되지 않은 경우 - 에러 표시하지 않음
        setBalance(null)
      }
    } catch (error) {
      console.error('Error loading balance:', error)
      setBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }

  function filterLogs() {
    let filtered = logs

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((log) => log.notification_type === filterType)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((log) => log.status === filterStatus)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((log) => {
        const studentName = log.students?.users?.name?.toLowerCase() || ''
        const studentCode = log.students?.student_code?.toLowerCase() || ''
        const message = log.message?.toLowerCase() || ''
        const phone = log.students?.users?.phone?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return (
          studentName.includes(search) ||
          studentCode.includes(search) ||
          message.includes(search) ||
          phone.includes(search)
        )
      })
    }

    setFilteredLogs(filtered)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-50">
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
        return <Badge variant="default" className="bg-blue-600">LMS</Badge>
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

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.notificationSystem;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="알림 시스템" description="SMS와 이메일을 통한 자동 알림 발송, 알림 스케줄 관리 등의 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="알림 시스템" reason="알림 발송 시스템 업데이트가 진행 중입니다." />;
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

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    sms: logs.filter((l) => l.notification_type === 'sms').length,
    lms: logs.filter((l) => l.notification_type === 'lms').length,
    kakao: logs.filter((l) => l.notification_type === 'kakao').length,
    email: logs.filter((l) => l.notification_type === 'email').length,
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">메시지 관리</h1>
            <p className="text-muted-foreground">메시지 전송 이력과 통계를 확인하세요</p>
          </div>
          <div className="flex items-center gap-4">
            {/* 잔액 정보 */}
            {balance && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">잔액</span>
                  <span className="ml-2 font-semibold">
                    {balance.balance.toLocaleString()}원
                  </span>
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
            )}
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
                <span>·</span>
                <span>LMS {stats.lms}</span>
                <span>·</span>
                <span className="text-yellow-600">알림톡 {stats.kakao}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전송 완료</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.sent}건</CardTitle>
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
              variant={filterType === 'kakao' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('kakao')}
              className={filterType === 'kakao' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}
            >
              알림톡 ({stats.kakao})
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
            <CardDescription>최근 200건의 메시지 전송 기록입니다</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>전송 이력이 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>메시지</TableHead>
                      <TableHead>전송 일시</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {log.students?.users?.name || '이름 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.students?.student_code}
                            </div>
                            {log.students?.users?.phone && (
                              <div className="text-xs text-muted-foreground">
                                {log.students.users.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(log.notification_type)}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm">{log.message}</p>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Dialogs */}
        <BulkMessageDialog
          open={sendMessageOpen}
          onOpenChange={setSendMessageOpen}
          onMessageSent={() => {
            loadNotificationLogs()
          }}
        />

        <ManageTemplatesDialog
          open={manageTemplatesOpen}
          onOpenChange={setManageTemplatesOpen}
        />
      </div>
    </PageWrapper>
  )
}
