"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@ui/card"
import { Button } from "@ui/button"
import { GripVertical, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardWidgetWrapperProps {
  widgetId: string
  children: ReactNode
  onHide?: () => void
  className?: string
  disablePadding?: boolean
}

export function DashboardWidgetWrapper({
  children,
  onHide,
  className,
  disablePadding = false,
}: DashboardWidgetWrapperProps) {
  return (
    <div className={cn("relative h-full group/edit", className)}>
      {/* Edit Mode Controls — 오버레이로 표시하여 콘텐츠 영역 침범 방지 */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 rounded-t-2xl",
        "bg-accent/80 backdrop-blur-sm border-b border-primary/20",
        "opacity-40 group-hover/edit:opacity-100 transition-all duration-200",
        disablePadding ? "px-2 py-0.5" : "px-3 py-1.5"
      )}>
        {/* 드래그 핸들: react-grid-layout이 draggableHandle=".widget-drag-handle"로 감지 */}
        <div
          className={cn(
            "widget-drag-handle cursor-grab active:cursor-grabbing touch-none rounded-md",
            "hover:bg-primary/10 transition-all duration-200 flex items-center gap-1",
            disablePadding ? "p-0.5" : "p-1"
          )}
        >
          <GripVertical className={cn(
            "text-muted-foreground hover:text-primary transition-colors",
            disablePadding ? "h-3.5 w-3.5" : "h-4 w-4"
          )} />
          {!disablePadding && (
            <span className="text-xs text-muted-foreground font-medium">
              드래그하여 이동
            </span>
          )}
        </div>

        {onHide && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hover:bg-destructive/10 hover:text-destructive transition-all",
              disablePadding ? "h-5 w-5" : "h-6 w-6"
            )}
            onClick={onHide}
            title="위젯 숨기기"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Widget Content — 편집/보기 모드 동일한 크기 유지 */}
      <Card className="transition-all duration-300 ease-out overflow-hidden h-full flex flex-col ring-2 ring-primary/30 shadow-lg hover:ring-primary/50 hover:shadow-xl">
        {disablePadding ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        ) : (
          <CardContent className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// Skeleton loader component for widgets
export function DashboardWidgetSkeleton({ variant = "default" }: { variant?: "default" | "stats" | "chart" | "list" }) {
  if (variant === "stats") {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50 duration-500">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden" style={{ animationDelay: `${i * 75}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-muted/80 rounded-md w-24 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="h-9 bg-gradient-to-r from-muted to-muted/60 rounded-md w-28 animate-pulse" style={{ animationDelay: `${i * 100 + 100}ms` }} />
                  <div className="h-3 bg-muted/60 rounded-md w-32 animate-pulse" style={{ animationDelay: `${i * 100 + 200}ms` }} />
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-muted to-muted/60 rounded-full animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (variant === "chart") {
    return (
      <Card className="overflow-hidden animate-in fade-in-50 duration-500">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 bg-muted/80 rounded-md w-36 animate-pulse" />
                <div className="h-3 bg-muted/60 rounded-md w-48 animate-pulse" style={{ animationDelay: '100ms' }} />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-muted rounded-md animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="h-9 w-24 bg-muted rounded-md animate-pulse" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
            <div className="relative h-64 bg-gradient-to-t from-muted/40 via-muted/60 to-muted/80 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/10 to-transparent animate-shimmer" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2 bg-muted/60 rounded-full animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                  <div className="h-4 bg-muted/80 rounded-md animate-pulse" style={{ animationDelay: `${i * 50 + 50}ms` }} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === "list") {
    return (
      <Card className="overflow-hidden animate-in fade-in-50 duration-500">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-muted/80 rounded-md w-40 animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded-md animate-pulse" style={{ animationDelay: '100ms' }} />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-muted/40" style={{ animationDelay: `${i * 75}ms` }}>
                <div className="h-12 w-12 bg-gradient-to-br from-muted to-muted/60 rounded-full shrink-0 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/80 rounded-md w-3/4 animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                  <div className="h-3 bg-muted/60 rounded-md w-1/2 animate-pulse" style={{ animationDelay: `${i * 100 + 100}ms` }} />
                </div>
                <div className="h-7 w-20 bg-muted rounded-md animate-pulse" style={{ animationDelay: `${i * 100 + 150}ms` }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default skeleton
  return (
    <Card className="overflow-hidden animate-in fade-in-50 duration-500">
      <CardContent className="p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted/80 rounded-md w-40 animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" style={{ animationDelay: '100ms' }} />
          </div>
          <div className="relative h-16 bg-gradient-to-r from-muted/60 via-muted/80 to-muted/60 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/10 to-transparent animate-shimmer" />
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-muted/80 rounded-md w-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="h-3 bg-muted/70 rounded-md w-11/12 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="h-3 bg-muted/60 rounded-md w-4/5 animate-pulse" style={{ animationDelay: '250ms' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-9 w-24 bg-muted rounded-md animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="h-9 w-24 bg-muted rounded-md animate-pulse" style={{ animationDelay: '350ms' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}