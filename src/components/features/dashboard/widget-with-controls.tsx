'use client'

import { ReactNode, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCw, Maximize2, Minimize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetWithControlsProps {
  children: ReactNode
  widgetId: string
  isRefreshing?: boolean
  isMaximized?: boolean
  onRefresh?: (widgetId: string) => void
  onMaximize?: (widgetId: string) => void
  className?: string
  showControls?: boolean
}

export function WidgetWithControls({
  children,
  widgetId,
  isRefreshing = false,
  isMaximized = false,
  onRefresh,
  onMaximize,
  className,
  showControls = true
}: WidgetWithControlsProps) {
  // Handle ESC key to close maximized widget
  useEffect(() => {
    if (!isMaximized) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMaximize?.(widgetId)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMaximized, widgetId, onMaximize])

  if (!showControls) {
    return <>{children}</>
  }

  return (
    <div className={cn("relative group h-full", className)}>
      {/* Widget Controls - subtle floating toolbar */}
      {!isMaximized && (
        <div className={cn(
          "absolute -top-3 right-2 z-[15]",
          "flex items-center gap-1 px-2 py-1.5 rounded-full",
          "bg-background border shadow-md",
          "opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out",
          "scale-90 group-hover:scale-100"
        )}>
          {onRefresh && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onRefresh(widgetId)
              }}
              disabled={isRefreshing}
              title="새로고침"
            >
              <RotateCw className={cn(
                "h-3 w-3",
                isRefreshing && "animate-spin"
              )} />
            </Button>
          )}
          {onMaximize && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onMaximize(widgetId)
              }}
              title="전체 화면"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Close button for maximized state */}
      {isMaximized && (
        <Button
          size="icon"
          variant="default"
          className={cn(
            "absolute top-4 right-4 z-[60]",
            "h-10 w-10 rounded-full shadow-xl",
            "hover:bg-destructive hover:text-destructive-foreground",
            "transition-all duration-200"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onMaximize(widgetId)
          }}
          title="닫기 (ESC)"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Maximized backdrop */}
      {isMaximized && (
        <div
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 animate-in fade-in-0 duration-200 cursor-pointer"
          onClick={() => onMaximize?.(widgetId)}
          title="배경을 클릭하여 닫기"
        />
      )}

      {/* Content wrapper */}
      <div className={cn(
        "h-full transition-opacity duration-200",
        isRefreshing && "opacity-60",
        isMaximized && "fixed inset-8 z-50 animate-in zoom-in-95 duration-200 overflow-auto rounded-lg shadow-2xl"
      )}>
        {children}
      </div>
    </div>
  )
}
