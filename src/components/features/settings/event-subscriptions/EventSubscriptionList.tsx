'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription } from '@ui/alert'
import { RefreshCw, Bell, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'
import { EventSubscriptionCard } from './EventSubscriptionCard'

interface EventSubscriptionListProps {
  initialSubscriptions: EventSubscription[]
}

export function EventSubscriptionList({ initialSubscriptions }: EventSubscriptionListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const { getEventSubscriptions } = await import('@/app/actions/messaging/event-subscriptions')
      const result = await getEventSubscriptions()
      if (result.success) {
        setSubscriptions(result.data)
      } else {
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
              onClick={handleRefreshAll}
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

      {/* Event Cards */}
      <div className="space-y-2">
        {subscriptions.map((sub) => (
          <EventSubscriptionCard
            key={sub.eventType}
            subscription={sub}
            onRefresh={handleRefresh}
          />
        ))}
      </div>
    </div>
  )
}
