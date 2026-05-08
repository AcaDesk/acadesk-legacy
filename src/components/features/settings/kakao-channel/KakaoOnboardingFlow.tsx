'use client'

import { useMemo, useState } from 'react'
import { Loader2, RefreshCw, Send, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Alert, AlertDescription } from '@ui/alert'

import { useEventSubscriptionsQuery } from '@/hooks/queries/use-event-subscriptions-query'
import {
  useProvisionAllTemplatesMutation,
  useRefreshAllStatusesMutation,
  useRetryProvisionMutation,
  useSendTestAlimtalkMutation,
} from '@/hooks/mutations/use-event-subscription-mutations'
import type { ProvisioningStatus } from '@/app/actions/messaging/event-subscriptions'

interface KakaoOnboardingFlowProps {
  hasKakaoChannel: boolean
}

const STATUS_META: Record<
  ProvisioningStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; Icon: typeof Clock }
> = {
  not_started: { label: '미등록', variant: 'outline', Icon: Clock },
  provisioning: { label: '준비 중', variant: 'secondary', Icon: Loader2 },
  inspecting: { label: '검수 중', variant: 'secondary', Icon: Clock },
  approved: { label: '승인', variant: 'default', Icon: CheckCircle2 },
  rejected: { label: '반려', variant: 'destructive', Icon: XCircle },
  failed: { label: '실패', variant: 'destructive', Icon: AlertTriangle },
}

export function KakaoOnboardingFlow({ hasKakaoChannel }: KakaoOnboardingFlowProps) {
  const { data: subscriptions = [], isLoading } = useEventSubscriptionsQuery()
  const provisionAllMutation = useProvisionAllTemplatesMutation()
  const refreshAllMutation = useRefreshAllStatusesMutation()
  const retryMutation = useRetryProvisionMutation()
  const testSendMutation = useSendTestAlimtalkMutation()

  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testEventType, setTestEventType] = useState('')

  const { totalCount, approvedCount, inspectingCount, failedCount, anyRegistered } = useMemo(() => {
    let approved = 0
    let inspecting = 0
    let failed = 0
    let registered = 0
    for (const sub of subscriptions) {
      if (sub.provisioningStatus === 'approved') approved++
      if (sub.provisioningStatus === 'inspecting' || sub.provisioningStatus === 'provisioning') inspecting++
      if (sub.provisioningStatus === 'rejected' || sub.provisioningStatus === 'failed') failed++
      if (sub.provisioningStatus !== 'not_started') registered++
    }
    return {
      totalCount: subscriptions.length,
      approvedCount: approved,
      inspectingCount: inspecting,
      failedCount: failed,
      anyRegistered: registered > 0,
    }
  }, [subscriptions])

  const approvedTemplates = useMemo(
    () => subscriptions.filter((s) => s.provisioningStatus === 'approved'),
    [subscriptions]
  )

  const allDone = totalCount > 0 && approvedCount === totalCount

  const handleOpenTestModal = () => {
    if (approvedTemplates.length > 0 && !testEventType) {
      setTestEventType(approvedTemplates[0].eventType)
    }
    setTestModalOpen(true)
  }

  const handleSendTest = async () => {
    if (!testPhone || !testEventType) return
    await testSendMutation.mutateAsync({
      phoneNumber: testPhone.replace(/-/g, ''),
      eventType: testEventType,
    })
    setTestModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* 공용 템플릿 자동 등록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            공용 이벤트 템플릿
          </CardTitle>
          <CardDescription>
            출석, 과제, 리포트 같은 운영 이벤트에 쓰는 기본 템플릿입니다. 등록 후 카카오 검수를 통과해야 자동 발송됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasKakaoChannel && (
            <Alert>
              <AlertDescription>
                카카오 채널을 먼저 연동한 후 템플릿을 등록할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {totalCount === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">등록 가능한 공용 템플릿이 없습니다.</p>
          )}

          {totalCount > 0 && (
            <ul className="space-y-2 text-sm">
              {subscriptions.map((sub) => (
                <li key={sub.eventType} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{sub.sharedTemplate.name}</p>
                    {sub.sharedTemplate.description && (
                      <p className="text-xs text-muted-foreground">{sub.sharedTemplate.description}</p>
                    )}
                  </div>
                  <StatusBadge status={sub.provisioningStatus} />
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => provisionAllMutation.mutate()}
              disabled={!hasKakaoChannel || provisionAllMutation.isPending}
            >
              {provisionAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {anyRegistered ? '미등록/실패 템플릿 다시 등록' : '공용 템플릿 등록 및 검수 요청'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검수 진행 상태 */}
      {anyRegistered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              검수 진행 상태
            </CardTitle>
            <CardDescription>
              결과 반영까지 보통 1~2영업일이 걸립니다. 필요할 때 바로 새로고침할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <SummaryPill label="승인" value={approvedCount} tone="success" />
              <SummaryPill label="진행 중" value={inspectingCount} tone="info" />
              <SummaryPill label="반려/실패" value={failedCount} tone="destructive" />
            </div>

            {failedCount > 0 && (
              <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">반려/실패 항목</p>
                <ul className="space-y-1">
                  {subscriptions
                    .filter((s) => s.provisioningStatus === 'rejected' || s.provisioningStatus === 'failed')
                    .map((s) => (
                      <li key={s.eventType} className="flex flex-wrap items-start gap-2">
                        <span className="font-medium">{s.sharedTemplate.name}</span>
                        {s.rejectionReason && (
                          <span className="text-xs text-muted-foreground">- {s.rejectionReason}</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retryMutation.mutate(s.eventType)}
                          disabled={retryMutation.isPending}
                        >
                          재등록
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
            >
              {refreshAllMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              지금 새로고침
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 연동 완료 + 테스트 발송 */}
      {anyRegistered && (
        <Card className={allDone ? 'border-success/30 bg-success/5' : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {allDone ? '연동 완료' : '발송 준비'}
            </CardTitle>
            <CardDescription>
              {allDone
                ? '모든 공용 템플릿이 승인되었습니다. 이제 학원 운영 이벤트가 발생하면 자동으로 알림톡이 발송됩니다.'
                : '승인된 템플릿이 1개 이상이면 테스트 발송이 가능합니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={allDone ? 'default' : 'outline'}
              onClick={handleOpenTestModal}
              disabled={approvedTemplates.length === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              테스트 알림톡 발송
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>테스트 알림톡 발송</DialogTitle>
            <DialogDescription>
              승인된 템플릿으로 본인 번호에 테스트 메시지를 발송합니다. 변수는 샘플 값으로 자동 채워집니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="test-phone">수신 번호</Label>
              <Input
                id="test-phone"
                placeholder="01012345678"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>템플릿</Label>
              <Select value={testEventType} onValueChange={setTestEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택" />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.map((sub) => (
                    <SelectItem key={sub.eventType} value={sub.eventType}>
                      {sub.sharedTemplate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={!testPhone || !testEventType || testSendMutation.isPending}
            >
              {testSendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: ProvisioningStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.Icon
  const isSpinning = status === 'provisioning'
  return (
    <Badge variant={meta.variant} className="gap-1 whitespace-nowrap">
      <Icon className={`h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
      {meta.label}
    </Badge>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: 'success' | 'info' | 'destructive' }) {
  const toneClass =
    tone === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : tone === 'destructive'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${toneClass}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}
