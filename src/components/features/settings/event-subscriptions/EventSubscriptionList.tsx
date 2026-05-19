'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { Alert, AlertDescription } from '@ui/alert'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  ChevronRight,
  Info,
  Inbox,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  bulkToggleEventSubscriptions,
  getEventSubscriptions,
  provisionTemplate,
  resetEventSubscriptionsToDefault,
  retryProvision,
  toggleEventSubscription,
  type EventSubscription,
} from '@/app/actions/messaging/event-subscriptions'
import { EventSubscriptionStatsCards } from './EventSubscriptionStatsCards'
import { EventSubscriptionTable } from './EventSubscriptionTable'
import { EventSubscriptionSidebar } from './EventSubscriptionSidebar'
import { EventSubscriptionTestDialog } from './EventSubscriptionTestDialog'

interface EventSubscriptionListProps {
  initialSubscriptions: EventSubscription[]
  /** SSR 단계에서 getEventSubscriptions 가 실패했을 때 이유 */
  initialLoadError?: string | null
}

export function EventSubscriptionList({
  initialSubscriptions,
  initialLoadError = null,
}: EventSubscriptionListProps) {
  const { toast } = useToast()
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [loadError, setLoadError] = useState<string | null>(initialLoadError)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [togglingEventType, setTogglingEventType] = useState<string | null>(null)
  const [provisioningEventType, setProvisioningEventType] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testInitialEvent, setTestInitialEvent] = useState<string | null>(null)

  const handleRefresh = useCallback(async () => {
    try {
      const result = await getEventSubscriptions()
      if (result.success) {
        setSubscriptions(result.data)
        setLoadError(null)
      } else {
        setLoadError(result.error || '알 수 없는 오류로 목록을 불러오지 못했습니다.')
      }
    } catch {
      setLoadError('목록을 불러오는 중 오류가 발생했습니다.')
    }
  }, [])

  async function handleToggle(eventType: string, enabled: boolean) {
    setTogglingEventType(eventType)
    try {
      const result = await toggleEventSubscription(eventType, enabled)
      if (!result.success) {
        toast({ variant: 'destructive', title: '변경 실패', description: result.error || '' })
        return
      }
      toast({ title: enabled ? '이벤트 활성화' : '이벤트 비활성화' })
      await handleRefresh()
    } finally {
      setTogglingEventType(null)
    }
  }

  async function handleProvision(eventType: string) {
    setProvisioningEventType(eventType)
    try {
      const result = await provisionTemplate(eventType)
      if (!result.success) {
        toast({ variant: 'destructive', title: '등록 실패', description: result.error || '' })
        return
      }
      toast({ title: '템플릿 등록 완료', description: '카카오 검수가 시작되었습니다.' })
      await handleRefresh()
    } finally {
      setProvisioningEventType(null)
    }
  }

  async function handleRetry(eventType: string) {
    setProvisioningEventType(eventType)
    try {
      const result = await retryProvision(eventType)
      if (!result.success) {
        toast({ variant: 'destructive', title: '재등록 실패', description: result.error || '' })
        return
      }
      toast({ title: '재등록 완료', description: '카카오 검수가 다시 시작되었습니다.' })
      await handleRefresh()
    } finally {
      setProvisioningEventType(null)
    }
  }

  async function handleBulkToggle(eventTypes: string[], enabled: boolean) {
    if (eventTypes.length === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkToggleEventSubscriptions(eventTypes, enabled)
      if (!result.success) {
        toast({ variant: 'destructive', title: '일괄 변경 실패', description: result.error || '' })
        return
      }
      const { updated, skipped } = result.data
      const action = enabled ? '활성화' : '일시 중지'
      toast({
        title: `${action} 적용`,
        description:
          skipped > 0
            ? `${updated}개 ${action} · ${skipped}개 건너뜀(미승인)`
            : `${updated}개 ${action}`,
      })
      await handleRefresh()
    } finally {
      setBulkBusy(false)
    }
  }

  const handleEnableAll = () =>
    handleBulkToggle(
      subscriptions.filter((s) => s.provisioningStatus === 'approved').map((s) => s.eventType),
      true,
    )
  const handlePauseAll = () =>
    handleBulkToggle(
      subscriptions.filter((s) => s.isEnabled).map((s) => s.eventType),
      false,
    )
  const handleEnableSelected = () => handleBulkToggle(Array.from(selected), true)
  const handlePauseSelected = () => handleBulkToggle(Array.from(selected), false)

  async function handleConfirmReset() {
    setResetting(true)
    try {
      const result = await resetEventSubscriptionsToDefault()
      if (!result.success) {
        toast({ variant: 'destructive', title: '복원 실패', description: result.error || '' })
        return
      }
      toast({
        title: '기본값 복원 완료',
        description: `${result.data.updated}개 이벤트가 일시 중지되었습니다.`,
      })
      setResetOpen(false)
      setSelected(new Set())
      await handleRefresh()
    } finally {
      setResetting(false)
    }
  }

  function openTestDialog(eventType?: string) {
    setTestInitialEvent(eventType ?? null)
    setTestDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">이벤트 알림</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            중요 이벤트가 발생했을 때 카카오 알림톡으로 자동 발송합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => openTestDialog()}>
          <Send className="mr-2 h-3.5 w-3.5" />
          알림 발송 테스트
        </Button>
      </div>

      {/* Stats */}
      <EventSubscriptionStatsCards subscriptions={subscriptions} />

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="min-w-0 space-y-4">
          {/* List card */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">이벤트 목록</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                  disabled={bulkBusy || resetting}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  기본값 복원
                </Button>
              </div>

              {subscriptions.length === 0 ? (
                <div className="space-y-3 py-10 text-center">
                  <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
                  {loadError ? (
                    <>
                      <p className="text-sm font-medium">이벤트 템플릿 목록을 불러오지 못했습니다</p>
                      <p className="whitespace-pre-line text-xs text-muted-foreground">{loadError}</p>
                      <Button size="sm" variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        다시 시도
                      </Button>
                    </>
                  ) : (
                    <p className="mx-auto max-w-md text-xs text-muted-foreground">
                      아카데스크 운영팀이 공용 알림톡 템플릿을 준비 중입니다.
                      <br />
                      문의: <a className="underline" href="mailto:support@acadesk.com">support@acadesk.com</a>
                    </p>
                  )}
                </div>
              ) : (
                <EventSubscriptionTable
                  subscriptions={subscriptions}
                  selected={selected}
                  onSelectionChange={setSelected}
                  togglingEventType={togglingEventType}
                  onToggle={handleToggle}
                  provisioningEventType={provisioningEventType}
                  onProvision={handleProvision}
                  onRetry={handleRetry}
                  onTestSend={openTestDialog}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <EventSubscriptionSidebar
            selectedCount={selected.size}
            busy={bulkBusy}
            onEnableAll={handleEnableAll}
            onPauseAll={handlePauseAll}
            onEnableSelected={handleEnableSelected}
            onPauseSelected={handlePauseSelected}
          />
        </div>
      </div>

      {/* Footer banner */}
      <Alert className="flex flex-wrap items-center justify-between gap-3 border-info/20 bg-info/5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-sm text-foreground">
            이벤트별 메시지 내용과 템플릿을 변경하려면 &lsquo;메시지 템플릿&rsquo; 메뉴를 이용하세요.
          </AlertDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/messaging-integration/kakao">
            <MessageSquareText className="mr-2 h-3.5 w-3.5" />
            메시지 템플릿 이동
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </Alert>

      {/* Reset confirm dialog */}
      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="기본값으로 복원하시겠습니까?"
        description="모든 이벤트 알림이 일시 중지 상태로 변경됩니다. 등록된 템플릿과 검수 상태는 그대로 유지되며 다시 켜기만 하면 사용할 수 있습니다."
        confirmText="기본값으로 복원"
        cancelText="취소"
        variant="destructive"
        isLoading={resetting}
        onConfirm={handleConfirmReset}
      />

      {/* Test send dialog */}
      <EventSubscriptionTestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        subscriptions={subscriptions}
        initialEventType={testInitialEvent}
      />
    </div>
  )
}
