'use client'

import { useState } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Switch } from '@ui/switch'
import { Card, CardContent } from '@ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui/collapsible'
import { KakaoTalkPreview } from '@/components/features/messaging/KakaoTalkPreview'
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Circle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { EventSubscription, ProvisioningStatus } from '@/app/actions/messaging/event-subscriptions'
import {
  toggleEventSubscription,
  provisionTemplate,
  refreshSubscriptionStatus,
  retryProvision,
} from '@/app/actions/messaging/event-subscriptions'

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<
  ProvisioningStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Circle }
> = {
  not_started: { label: '미등록', variant: 'outline', icon: Circle },
  provisioning: { label: '등록중', variant: 'secondary', icon: Clock },
  inspecting: { label: '검수중', variant: 'secondary', icon: Clock },
  approved: { label: '승인됨', variant: 'default', icon: CheckCircle2 },
  rejected: { label: '반려', variant: 'destructive', icon: XCircle },
  failed: { label: '실패', variant: 'destructive', icon: AlertTriangle },
}

// ============================================================================
// Event Display Names
// ============================================================================

const EVENT_DISPLAY: Record<string, { name: string; description: string; icon: string }> = {
  check_in: { name: '등원 알림', description: '키오스크 체크인 시 보호자에게 알림', icon: '🏫' },
  check_out: { name: '하원 알림', description: '키오스크 체크아웃 시 보호자에게 알림', icon: '👋' },
  attendance_confirmed: { name: '출석 확인', description: '출석 처리 완료 시 보호자에게 알림', icon: '✅' },
  absence_detected: { name: '결석 알림', description: '결석 처리 시 보호자에게 알림', icon: '⚠️' },
  homework_assigned: { name: '숙제 등록 안내', description: '새 숙제 배정 시 보호자에게 알림', icon: '📝' },
  homework_deadline: { name: '숙제 마감 안내', description: '마감일 전날 보호자에게 리마인더', icon: '⏰' },
  monthly_report_ready: { name: '월말 리포트 안내', description: '학습 리포트 준비 완료 시 보호자에게 알림', icon: '📊' },
  consultation_scheduled: { name: '상담 일정 안내', description: '상담 확정 시 보호자에게 알림', icon: '💬' },
  payment_confirmed: { name: '결제 완료 안내', description: '결제 완료 시 보호자에게 알림', icon: '💰' },
  payment_overdue: { name: '미납 안내', description: '수강료 미납 시 보호자에게 알림', icon: '💸' },
}

// ============================================================================
// Component
// ============================================================================

interface EventSubscriptionCardProps {
  subscription: EventSubscription
  onRefresh: () => void
}

export function EventSubscriptionCard({ subscription, onRefresh }: EventSubscriptionCardProps) {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const status = subscription.provisioningStatus
  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const display = EVENT_DISPLAY[subscription.eventType] || {
    name: subscription.sharedTemplate.name,
    description: subscription.sharedTemplate.description || '',
    icon: '📨',
  }

  const canToggle = status === 'approved'
  const canProvision = status === 'not_started'
  const canRetry = status === 'rejected' || status === 'failed'
  const canRefreshStatus = status === 'inspecting' || status === 'provisioning'

  async function handleToggle(enabled: boolean) {
    setIsToggling(true)
    try {
      const result = await toggleEventSubscription(subscription.eventType, enabled)
      if (!result.success) {
        toast({ variant: 'destructive', title: '변경 실패', description: result.error || '' })
        return
      }
      toast({ title: enabled ? '이벤트 활성화' : '이벤트 비활성화' })
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: '오류 발생' })
    } finally {
      setIsToggling(false)
    }
  }

  async function handleProvision() {
    setIsProvisioning(true)
    try {
      const result = await provisionTemplate(subscription.eventType)
      if (!result.success) {
        toast({ variant: 'destructive', title: '등록 실패', description: result.error || '' })
        return
      }
      toast({ title: '템플릿 등록 완료', description: '카카오 검수가 시작되었습니다.' })
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: '오류 발생' })
    } finally {
      setIsProvisioning(false)
    }
  }

  async function handleRefreshStatus() {
    setIsRefreshing(true)
    try {
      const result = await refreshSubscriptionStatus(subscription.eventType)
      if (!result.success) {
        toast({ variant: 'destructive', title: '상태 확인 실패', description: result.error || '' })
        return
      }
      if (result.data?.status === 'approved') {
        toast({ title: '템플릿 승인됨', description: '이제 이벤트를 활성화할 수 있습니다.' })
      } else if (result.data?.status === 'rejected') {
        toast({ variant: 'destructive', title: '템플릿 반려', description: result.data.rejectionReason || '' })
      } else {
        toast({ title: '아직 검수 중입니다' })
      }
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: '오류 발생' })
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleRetry() {
    setIsProvisioning(true)
    try {
      const result = await retryProvision(subscription.eventType)
      if (!result.success) {
        toast({ variant: 'destructive', title: '재등록 실패', description: result.error || '' })
        return
      }
      toast({ title: '재등록 완료', description: '카카오 검수가 다시 시작되었습니다.' })
      onRefresh()
    } catch {
      toast({ variant: 'destructive', title: '오류 발생' })
    } finally {
      setIsProvisioning(false)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Header: icon + name + status, switch is top-right */}
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 leading-none mt-0.5">{display.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{display.name}</span>
              <Badge variant={statusConfig.variant} className="text-[10px] px-1.5 py-0 h-5 gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{display.description}</p>
          </div>
          <Switch
            checked={subscription.isEnabled}
            onCheckedChange={handleToggle}
            disabled={!canToggle || isToggling}
          />
        </div>

        {/* Rejection reason */}
        {subscription.rejectionReason && (status === 'rejected' || status === 'failed') && (
          <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
            {subscription.rejectionReason}
          </div>
        )}

        {/* Actions row */}
        {(canProvision || canRefreshStatus || canRetry) && (
          <div className="flex flex-wrap items-center gap-2">
            {canProvision && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleProvision}
                disabled={isProvisioning}
                className="text-xs h-7"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {isProvisioning ? '등록중...' : '템플릿 등록'}
              </Button>
            )}
            {canRefreshStatus && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="text-xs h-7"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            )}
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isProvisioning}
                className="text-xs h-7"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {isProvisioning ? '등록중...' : '재등록'}
              </Button>
            )}
          </div>
        )}

        {/* Spacer to push preview toggle to bottom of card */}
        <div className="flex-1" />

        {/* Template Preview (Collapsible) */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="pt-1 border-t border-border/60">
          <CollapsibleTrigger className="flex items-center gap-1 pt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            카카오톡 발송 미리보기
          </CollapsibleTrigger>
          <CollapsibleContent>
            <KakaoTalkPreview
              className="mt-2"
              content={subscription.sharedTemplate.content}
              variables={subscription.sharedTemplate.variables}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
