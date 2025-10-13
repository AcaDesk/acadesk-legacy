"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardWidgetWrapperProps {
  widgetId: string
  isEditMode: boolean
  children: ReactNode
  onHide?: () => void
  className?: string
  disablePadding?: boolean
}

export function DashboardWidgetWrapper({
  widgetId,
  isEditMode,
  children,
  onHide,
  className,
  disablePadding = false,
}: DashboardWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: widgetId,
    disabled: !isEditMode,
    animateLayoutChanges: () => true,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || (isSorting ? 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)' : undefined),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isDragging && "z-50 cursor-grabbing",
        className
      )}
    >
      {/* Widget Content */}
      <Card
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden group h-full flex flex-col",
          isEditMode && "ring-2 ring-primary/30 shadow-lg hover:ring-primary/50 hover:shadow-xl",
          !isEditMode && "hover:shadow-md hover:border-primary/20",
          isDragging && "rotate-3 scale-105 ring-4 ring-primary/40",
        )}
      >
        {/* Edit Mode Controls - Compact header inside the card */}
        {isEditMode && (
          <div className={cn(
            "flex items-center justify-between gap-2 px-3 py-2 bg-accent/30 border-b border-border shrink-0",
            "animate-in slide-in-from-top-2 fade-in duration-300"
          )}>
            <button
              className={cn(
                "cursor-grab active:cursor-grabbing touch-none p-1 rounded-md",
                "hover:bg-primary/10 hover:shadow-sm transition-all duration-200",
                "hover:scale-110 active:scale-95",
                "animate-in fade-in zoom-in-95 duration-300 delay-75"
              )}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            </button>

            <span className="text-xs text-muted-foreground font-medium flex-1 text-center animate-in fade-in duration-300 delay-100">
              드래그하여 이동
            </span>

            {onHide && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-all",
                  "animate-in fade-in zoom-in-95 duration-300 delay-150"
                )}
                onClick={onHide}
                title="위젯 숨기기"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Main Content - Flex-1 to fill remaining space */}
        {disablePadding ? (
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        ) : (
          <CardContent className="p-6 flex-1 flex flex-col">
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