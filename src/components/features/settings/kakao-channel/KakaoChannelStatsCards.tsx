'use client'

import { Card, CardContent } from '@ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  KakaoChannelConfig,
  KakaoChannelStats,
} from '@/app/actions/messaging/kakao-channel'

interface KakaoChannelStatsCardsProps {
  config: KakaoChannelConfig | null
  stats: KakaoChannelStats
}

const CHANNEL_STATUS_LABEL: Record<NonNullable<KakaoChannelConfig['channelStatus']>, string> = {
  active: '승인 완료',
  pending: '검수 대기',
  suspended: '중지됨',
}

interface StatCardData {
  label: string
  value: string
  subline: string
  hint: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  valueColor?: string
}

export function KakaoChannelStatsCards({ config, stats }: KakaoChannelStatsCardsProps) {
  const statusLabel = config?.channelStatus
    ? CHANNEL_STATUS_LABEL[config.channelStatus]
    : '미연동'
  const isApproved = config?.channelStatus === 'active'

  const failedOrPending = stats.failedCount + stats.pendingCount
  const successRateText =
    stats.successRate !== null ? `${Math.round(stats.successRate * 100)}%` : '-'

  const cards: StatCardData[] = [
    {
      label: '승인 상태',
      value: statusLabel,
      subline: isApproved ? '알림톡 발송이 가능합니다.' : '채널 검수가 필요합니다.',
      hint: '카카오 비즈니스 채널 검수 상태입니다. 검수 완료 후 알림톡 발송이 가능합니다.',
      icon: CheckCircle2,
      iconBg: isApproved
        ? 'bg-emerald-100 dark:bg-emerald-900/30'
        : 'bg-slate-100 dark:bg-slate-800',
      iconColor: isApproved
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500',
      valueColor: isApproved ? 'text-emerald-600 dark:text-emerald-400' : undefined,
    },
    {
      label: '최근 발송',
      value: `${stats.totalCount}건`,
      subline: '최근 7일 기준',
      hint: '최근 7일간 시도된 카카오 알림톡 발송 건수입니다 (성공 + 실패 + 대기).',
      icon: Send,
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: '성공률',
      value: successRateText,
      subline: '최근 7일 기준',
      hint: '성공 ÷ (성공 + 실패). 대기 건은 분모에서 제외합니다.',
      icon: BarChart3,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: '실패/대기',
      value: `${failedOrPending}건`,
      subline: '최근 7일 기준',
      hint: '발송 실패 또는 발송 대기 상태인 건수입니다.',
      icon: AlertTriangle,
      iconBg: failedOrPending > 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800',
      iconColor: failedOrPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500',
      valueColor: failedOrPending > 0 ? 'text-rose-600 dark:text-rose-400' : undefined,
    },
  ]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', c.iconBg)}>
                      <Icon className={cn('h-4 w-4', c.iconColor)} />
                    </div>
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                      {c.hint}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn('text-2xl font-semibold tabular-nums', c.valueColor)}>{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.subline}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
