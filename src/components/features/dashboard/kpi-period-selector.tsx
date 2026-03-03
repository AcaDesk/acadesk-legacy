'use client'

import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group'
import type { KPIPeriod } from '@/app/actions/dashboard-kpi'

interface KPIPeriodSelectorProps {
  period: KPIPeriod
  onChange: (period: KPIPeriod) => void
}

export function KPIPeriodSelector({ period, onChange }: KPIPeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">기간</span>
      <ToggleGroup
        type="single"
        value={period}
        onValueChange={(v) => { if (v) onChange(v as KPIPeriod) }}
        size="sm"
      >
        <ToggleGroupItem value="today" className="h-7 px-3 text-xs">오늘</ToggleGroupItem>
        <ToggleGroupItem value="week" className="h-7 px-3 text-xs">이번 주</ToggleGroupItem>
        <ToggleGroupItem value="month" className="h-7 px-3 text-xs">이번 달</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
