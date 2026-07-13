'use client'

import { X } from 'lucide-react'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'

export type PresetFilter = 'today' | 'notSent' | 'sent'

interface ReportFilterPresetsProps {
  activePresets: PresetFilter[]
  onToggle: (preset: PresetFilter) => void
}

const PRESETS: { key: PresetFilter; label: string }[] = [
  { key: 'today', label: '오늘 생성' },
  { key: 'notSent', label: '미전송' },
  { key: 'sent', label: '전송 완료' },
]

export function ReportFilterPresets({ activePresets, onToggle }: ReportFilterPresetsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">빠른 필터</span>
      {PRESETS.map((preset) => {
        const isActive = activePresets.includes(preset.key)
        return (
          <Badge
            key={preset.key}
            variant="outline"
            className={cn(
              'h-8 px-3 cursor-pointer transition-colors select-none',
              isActive
                ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                : 'bg-muted/50 border-border hover:bg-muted'
            )}
            onClick={() => onToggle(preset.key)}
          >
            {preset.label}
            {isActive && <X className="ml-1.5 h-3 w-3" />}
          </Badge>
        )
      })}
    </div>
  )
}
