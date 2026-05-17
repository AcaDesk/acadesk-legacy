'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Circle,
  ArrowRight,
} from 'lucide-react'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Alert, AlertDescription } from '@ui/alert'
import { Progress } from '@ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { Separator } from '@ui/separator'
import { cn } from '@/lib/utils'

import { useEventSubscriptionsQuery } from '@/hooks/queries/use-event-subscriptions-query'
import {
  useProvisionAllTemplatesMutation,
  useRefreshAllStatusesMutation,
  useRetryProvisionMutation,
  useSendTestAlimtalkMutation,
} from '@/hooks/mutations/use-event-subscription-mutations'

interface KakaoOnboardingFlowProps {
  hasKakaoChannel: boolean
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

  const stats = useMemo(() => {
    let approved = 0
    let inspecting = 0
    let failed = 0
    let notStarted = 0
    for (const sub of subscriptions) {
      if (sub.provisioningStatus === 'approved') approved++
      else if (sub.provisioningStatus === 'inspecting' || sub.provisioningStatus === 'provisioning')
        inspecting++
      else if (sub.provisioningStatus === 'rejected' || sub.provisioningStatus === 'failed')
        failed++
      else notStarted++
    }
    return {
      total: subscriptions.length,
      approved,
      inspecting,
      failed,
      notStarted,
      anyRegistered: approved + inspecting + failed > 0,
      allDone: subscriptions.length > 0 && approved === subscriptions.length,
    }
  }, [subscriptions])

  const failingSubs = useMemo(
    () =>
      subscriptions.filter(
        (s) => s.provisioningStatus === 'rejected' || s.provisioningStatus === 'failed',
      ),
    [subscriptions],
  )

  const approvedTemplates = useMemo(
    () => subscriptions.filter((s) => s.provisioningStatus === 'approved'),
    [subscriptions],
  )

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

  const approvedPercent = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      {/* 공용 템플릿 등록 진척 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">공용 이벤트 템플릿</CardTitle>
              <CardDescription className="mt-1">
                운영 이벤트(출석·과제·리포트 등) 자동 알림용. 등록 후 카카오 검수가 필요합니다.
              </CardDescription>
            </div>
            {stats.total > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                전체 <span className="text-foreground font-semibold">{stats.total}</span>개
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasKakaoChannel && (
            <Alert>
              <AlertDescription>
                카카오 채널을 먼저 연동한 후 템플릿을 등록할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {stats.total === 0 && !isLoading && hasKakaoChannel && (
            <p className="text-sm text-muted-foreground">등록 가능한 공용 템플릿이 없습니다.</p>
          )}

          {stats.total > 0 && (
            <>
              {/* 승인 진척률 — shadcn Progress 단일 바 */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-foreground">승인 진척</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="text-foreground font-semibold">{stats.approved}</span>
                    <span> / {stats.total}</span>
                    <span className="ml-1.5 text-muted-foreground">({approvedPercent}%)</span>
                  </span>
                </div>
                <Progress value={approvedPercent} className="h-2" />
              </div>

              <Separator />

              {/* 통계 4종 (Tooltip 설명 포함) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatItem
                  icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                  label="승인"
                  value={stats.approved}
                  hint="카카오 검수를 통과해 자동 발송 가능한 템플릿"
                />
                <StatItem
                  icon={<Clock className="h-4 w-4 text-blue-500" />}
                  label="검수 중"
                  value={stats.inspecting}
                  hint="카카오에서 심사 진행 중 (보통 1~2영업일 소요)"
                />
                <StatItem
                  icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                  label="반려/실패"
                  value={stats.failed}
                  tone={stats.failed > 0 ? 'destructive' : undefined}
                  hint="검수 반려되었거나 등록 실패한 템플릿. 사유를 확인하고 재등록하세요."
                />
                <StatItem
                  icon={<Circle className="h-4 w-4 text-muted-foreground" />}
                  label="미등록"
                  value={stats.notStarted}
                  hint="아직 학원 솔라피 계정에 등록되지 않은 공용 템플릿"
                />
              </div>

              {/* 반려/실패만 강조 */}
              {failingSubs.length > 0 && (
                <div className="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    주의 필요 ({failingSubs.length})
                  </p>
                  <ul className="space-y-1.5">
                    {failingSubs.map((s) => (
                      <li
                        key={s.eventType}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                      >
                        <span className="font-medium">{s.sharedTemplate.name}</span>
                        {s.rejectionReason && (
                          <span className="text-muted-foreground truncate max-w-[40ch]">
                            — {s.rejectionReason}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs ml-auto"
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
            </>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => provisionAllMutation.mutate()}
              disabled={!hasKakaoChannel || provisionAllMutation.isPending || stats.total === 0}
              size="sm"
            >
              {provisionAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!stats.anyRegistered
                ? '공용 템플릿 일괄 등록'
                : stats.notStarted + stats.failed > 0
                  ? `미등록·실패 ${stats.notStarted + stats.failed}건 재등록`
                  : '모두 등록됨'}
            </Button>
            {stats.anyRegistered && (
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
            )}
            {stats.total > 0 && (
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <Link href="/settings/messaging-integration/events">
                  개별 관리 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 테스트 발송 */}
      {stats.anyRegistered && (
        <Card className={stats.allDone ? 'border-success/30 bg-success/5' : undefined}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {stats.allDone ? '연동 완료' : '테스트 발송 가능'}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.allDone
                  ? '모든 공용 템플릿이 승인되어 자동 발송이 시작됩니다.'
                  : `승인된 템플릿 ${stats.approved}건으로 테스트 메시지를 보낼 수 있습니다.`}
              </p>
            </div>
            <Button
              size="sm"
              variant={stats.allDone ? 'default' : 'outline'}
              onClick={handleOpenTestModal}
              disabled={approvedTemplates.length === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              테스트 발송
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
    <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>테스트 알림톡 발송</DialogTitle>
            <DialogDescription>
              승인된 템플릿으로 본인 번호에 테스트 메시지를 발송합니다. 변수는 샘플 값으로 자동
              채워집니다.
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

function StatItem({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'destructive'
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'destructive' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
