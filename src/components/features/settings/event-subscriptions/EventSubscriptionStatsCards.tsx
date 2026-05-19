'use client'

import { Card, CardContent } from '@ui/card'
import { Bell, BellOff, CheckCircle2, PauseCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'

interface EventSubscriptionStatsCardsProps {
  subscriptions: EventSubscription[]
}

interface StatCardConfig {
  key: 'total' | 'active' | 'paused' | 'inactive'
  label: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'total',
    label: '전체 이벤트',
    icon: Bell,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'active',
    label: '사용 중',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'paused',
    label: '일시 중지',
    icon: PauseCircle,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
  {
    key: 'inactive',
    label: '사용 안함',
    icon: BellOff,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-500 dark:text-slate-500',
  },
]

export function EventSubscriptionStatsCards({ subscriptions }: EventSubscriptionStatsCardsProps) {
  const total = subscriptions.length
  const active = subscriptions.filter((s) => s.isEnabled).length
  const paused = subscriptions.filter((s) => s.provisioningStatus === 'approved' && !s.isEnabled).length
  const inactive = total - active - paused

  const counts = { total, active, paused, inactive }

  function formatPercent(value: number): string {
    if (total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((cfg) => {
        const Icon = cfg.icon
        const value = counts[cfg.key]
        const subline =
          cfg.key === 'total'
            ? `사용 중 ${active}개`
            : formatPercent(value)
        return (
          <Card key={cfg.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', cfg.iconBg)}>
                <Icon className={cn('h-5 w-5', cfg.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold">{value}개</span>
                </div>
                <p className="text-xs text-muted-foreground">{subline}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
