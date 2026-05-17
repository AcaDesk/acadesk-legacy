'use client'

import { useState, useCallback } from 'react'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription } from '@ui/alert'
import { RefreshCw, Bell, Info, Inbox } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'
import { EventSubscriptionCard } from './EventSubscriptionCard'

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
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const { getEventSubscriptions } = await import('@/app/actions/messaging/event-subscriptions')
      const result = await getEventSubscriptions()
      if (result.success) {
        setSubscriptions(result.data)
        setLoadError(null)
      } else {
        setLoadError(result.error || '알 수 없는 오류로 목록을 불러오지 못했습니다.')
        toast({ variant: 'destructive', title: '새로고침 실패', description: result.error || '' })
      }
    } catch {
      toast({ variant: 'destructive', title: '오류 발생' })
    } finally {
      setIsRefreshing(false)
    }
  }, [toast])

  const approvedCount = subscriptions.filter((s) => s.provisioningStatus === 'approved').length
  const enabledCount = subscriptions.filter((s) => s.isEnabled).length
  const inspectingCount = subscriptions.filter(
    (s) => s.provisioningStatus === 'inspecting' || s.provisioningStatus === 'provisioning'
  ).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                이벤트 알림
              </CardTitle>
              <CardDescription>
                원하는 이벤트를 선택하면, 해당 상황 발생 시 보호자에게 카카오 알림톡이 자동 발송됩니다.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">승인됨</span>
              <span className="font-semibold">{approvedCount}개</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">활성화</span>
              <span className="font-semibold text-primary">{enabledCount}개</span>
            </div>
            {inspectingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">검수중</span>
                <span className="font-semibold text-amber-600">{inspectingCount}개</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Alert className="border-info/20 bg-info/5">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">이벤트 알림 사용 방법</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li><strong>템플릿 등록</strong>을 클릭하면 학원 솔라피 계정에 자동으로 등록됩니다</li>
            <li>카카오에서 <strong>검수</strong>를 진행합니다 (보통 1~2 영업일)</li>
            <li>검수 승인 후 <strong>토글을 켜면</strong> 해당 이벤트 발생 시 보호자에게 알림톡이 발송됩니다</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Event Cards — xl 2열, 2xl 3열 그리드 */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-3 max-w-md mx-auto">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
              {loadError ? (
                <>
                  <p className="text-sm font-medium">이벤트 템플릿 목록을 불러오지 못했습니다</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{loadError}</p>
                  <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    다시 시도
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">공용 이벤트 템플릿이 아직 준비되지 않았습니다</p>
                  <p className="text-xs text-muted-foreground">
                    아카데스크 운영팀이 공용 알림톡 템플릿을 준비 중입니다.<br />
                    준비가 완료되면 이 화면에서 바로 등록·검수 요청을 진행하실 수 있습니다.<br />
                    문의: <a href="mailto:support@acadesk.com" className="underline">support@acadesk.com</a>
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {subscriptions.map((sub) => (
            <EventSubscriptionCard
              key={sub.eventType}
              subscription={sub}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
