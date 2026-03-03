'use client'

import { EyeOff, Plus } from 'lucide-react'
import { Button } from '@ui/button'
import { WIDGET_NAMES } from '@/app/(dashboard)/dashboard/dashboard-layout-config'
import type { DashboardWidgetId } from '@/core/types/dashboard'

interface WidgetGhostPlaceholderProps {
  widgetId: DashboardWidgetId
  onShow: (id: string) => void
}

export function WidgetGhostPlaceholder({ widgetId, onShow }: WidgetGhostPlaceholderProps) {
  return (
    <div className="h-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 flex flex-col items-center justify-center gap-2 p-4 widget-drag-handle">
      <EyeOff className="h-6 w-6 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground text-center">
        {WIDGET_NAMES[widgetId] || widgetId}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation()
          onShow(widgetId)
        }}
      >
        <Plus className="h-3 w-3 mr-1" />
        표시
      </Button>
    </div>
  )
}
